#!/usr/bin/env python3
"""
Enhanced TEI XML structure analyzer for alchemical dictionaries.
This script provides a more targeted analysis of the dictionary entry structure.
"""

import os
import json
from lxml import etree
from collections import Counter, defaultdict
from datetime import datetime

# TEI namespace
NS = {'tei': 'http://www.tei-c.org/ns/1.0'}

def parse_xml(file_path):
    """Parse XML file and return the root element."""
    try:
        parser = etree.XMLParser(remove_blank_text=True)
        tree = etree.parse(file_path, parser)
        return tree.getroot()
    except Exception as e:
        print(f"Error parsing {file_path}: {e}")
        return None

def get_tag_name(element):
    """Get a clean tag name without namespace."""
    if isinstance(element.tag, str):
        return element.tag.replace('{' + NS['tei'] + '}', 'tei:')
    return "COMMENT_OR_PROCESSING_INSTRUCTION"

def analyze_entry_structure(root, filename):
    """Focus specifically on the structure of dictionary entries."""
    # Find all entries
    entries = root.xpath('.//tei:entry', namespaces=NS)
    print(f"Found {len(entries)} entries in {filename}")
    
    # Track entry structure patterns
    entry_structures = []
    attribute_stats = defaultdict(Counter)
    element_stats = Counter()
    
    # Analyze a sample of entries (for efficiency)
    sample_size = min(500, len(entries))
    sample_entries = entries[:sample_size]
    
    for i, entry in enumerate(sample_entries):
        # Get entry attributes
        entry_attrs = dict(entry.attrib)
        for key, value in entry_attrs.items():
            clean_key = key.replace('{http://www.w3.org/XML/1998/namespace}', 'xml:')
            attribute_stats[clean_key][value] += 1
        
        # Create a structure signature of this entry (what elements it contains and in what order)
        structure = []
        
        # Process the direct children of dictScrap if that's the structure
        dict_scrap = entry.find('.//tei:dictScrap', namespaces=NS)
        target = dict_scrap if dict_scrap is not None else entry
        
        for child in target.iterchildren():
            if isinstance(child.tag, str):  # Skip comments
                tag = get_tag_name(child)
                structure.append(tag)
                element_stats[tag] += 1
                
                # Also collect attribute stats for important elements
                if tag in ['tei:form', 'tei:sense', 'tei:def', 'tei:cit']:
                    for attr_key, attr_val in child.attrib.items():
                        clean_key = f"{tag}[@{attr_key.replace('{http://www.w3.org/XML/1998/namespace}', 'xml:')}]"
                        attribute_stats[clean_key][attr_val] += 1
        
        entry_structures.append(structure)
    
    # Identify the most common entry structures
    structure_patterns = Counter()
    for structure in entry_structures:
        structure_patterns[tuple(structure)] += 1
    
    # Get example text for each key element type
    element_examples = {}
    for element_type in ['form', 'def', 'sense', 'cit', 'note']:
        xpath = f'.//tei:{element_type}'
        elements = root.xpath(xpath, namespaces=NS)
        examples = []
        
        # Get 5 examples of different lengths
        if elements:
            elements_with_text = [(e, e.text.strip() if e.text else "") for e in elements 
                                  if e.text and e.text.strip()]
            
            if elements_with_text:
                # Sort by text length
                elements_with_text.sort(key=lambda x: len(x[1]))
                
                # Get examples from different parts of the sorted list
                total = len(elements_with_text)
                indices = [int(i * (total-1) / 4) for i in range(5)]
                
                for idx in indices:
                    if idx < len(elements_with_text):
                        element, text = elements_with_text[idx]
                        if text:
                            # Get any type attribute
                            type_attr = element.get('type', '')
                            examples.append({
                                'text': text[:100] + ('...' if len(text) > 100 else ''),
                                'type': type_attr
                            })
        
        element_examples[element_type] = examples
    
    # Find entries with different patterns for language tagging
    language_patterns = []
    language_elements = root.xpath('.//*[@xml:lang]', namespaces={'xml': 'http://www.w3.org/XML/1998/namespace'})
    language_stats = Counter()
    
    for el in language_elements[:100]:  # Limit to 100 for efficiency
        lang = el.get('{http://www.w3.org/XML/1998/namespace}lang')
        parent_tag = get_tag_name(el)
        language_stats[f"{parent_tag}[@xml:lang='{lang}']"] += 1
    
    # Check for specialized dictionary elements
    specialized_elements = {}
    for special_el in ['gramGrp', 'usg', 'etym', 'xr', 'orth', 'pron', 'g']:
        elements = root.xpath(f'.//tei:{special_el}', namespaces=NS)
        if elements:
            specialized_elements[special_el] = len(elements)
    
    return {
        'filename': filename,
        'entry_count': len(entries),
        'common_structures': {
            ' → '.join(pattern): count 
            for pattern, count in structure_patterns.most_common(10)
        },
        'element_frequency': dict(element_stats.most_common()),
        'attribute_usage': {
            k: dict(v.most_common(5)) for k, v in attribute_stats.items()
        },
        'element_examples': element_examples,
        'language_usage': dict(language_stats.most_common()),
        'specialized_elements': specialized_elements
    }

def analyze_cross_references(root, filename):
    """Analyze potential cross-references between entries."""
    # Find any xr (cross-reference) elements
    xrs = root.xpath('.//tei:xr', namespaces=NS)
    xr_info = {'count': len(xrs), 'types': Counter(), 'examples': []}
    
    # Analyze a sample
    for xr in xrs[:50]:
        xr_type = xr.get('type', 'unspecified')
        xr_info['types'][xr_type] += 1
        
        # Get the text of the cross-reference
        if len(xr_info['examples']) < 10:
            text = ' '.join(xr.xpath('.//text()'))
            if text.strip():
                xr_info['examples'].append(text.strip()[:100])
    
    # Look for other potential cross-reference patterns (like "vide", "see", etc.)
    potential_refs = []
    for term in ['vide', 'vid.', 'siehe', 'see ', 'q.v.']:
        xpath = f'.//tei:entry[contains(., "{term}")]'
        entries = root.xpath(xpath, namespaces=NS)
        if entries:
            potential_refs.append({
                'term': term,
                'count': len(entries),
                'example': etree.tostring(entries[0], encoding='unicode', method='text')[:100] + '...' if entries else ''
            })
    
    return {
        'filename': filename,
        'explicit_xr': xr_info,
        'potential_refs': potential_refs
    }

def analyze_symbols(root, filename):
    """Analyze the use of symbols (<g> elements) in the dictionary."""
    symbols = root.xpath('.//tei:g', namespaces=NS)
    symbol_refs = Counter()
    
    for symbol in symbols:
        ref = symbol.get('ref', '')
        symbol_refs[ref] += 1
    
    # Check for glyph declarations in the header
    glyphs = root.xpath('.//tei:glyph', namespaces=NS)
    
    return {
        'filename': filename,
        'symbol_count': len(symbols),
        'glyph_declarations': len(glyphs),
        'common_symbols': dict(symbol_refs.most_common(20))
    }

def analyze_tei_file(file_path):
    """Perform comprehensive analysis of a TEI XML file."""
    filename = os.path.basename(file_path)
    print(f"Analyzing {filename}...")
    
    root = parse_xml(file_path)
    if root is None:
        return None
    
    # Perform different types of analysis
    entry_analysis = analyze_entry_structure(root, filename)
    xref_analysis = analyze_cross_references(root, filename)
    symbol_analysis = analyze_symbols(root, filename)
    
    return {
        'filename': filename,
        'entry_structure': entry_analysis,
        'cross_references': xref_analysis,
        'symbols': symbol_analysis
    }

def generate_report(analysis_results):
    """Generate a detailed human-readable report from the analysis results."""
    report = []
    
    for result in analysis_results:
        if result is None:
            continue
        
        filename = result['filename']
        entry_structure = result['entry_structure']
        cross_references = result['cross_references']
        symbols = result['symbols']
        
        report.append(f"\n{'='*50}")
        report.append(f"ANALYSIS OF {filename}")
        report.append(f"{'='*50}\n")
        
        # Entry Structure Report
        report.append(f"1. DICTIONARY ENTRY STRUCTURE")
        report.append(f"   Total entries: {entry_structure['entry_count']}")
        
        report.append(f"\n   1.1 Common Entry Structures (Element Sequences)")
        for pattern, count in entry_structure['common_structures'].items():
            percentage = (count / min(500, entry_structure['entry_count'])) * 100
            report.append(f"   - {pattern}")
            report.append(f"     {count} entries ({percentage:.1f}% of sample)")
        
        report.append(f"\n   1.2 Element Frequency")
        for element, count in entry_structure['element_frequency'].items():
            report.append(f"   - {element}: {count}")
        
        report.append(f"\n   1.3 Important Element Examples")
        for element_type, examples in entry_structure['element_examples'].items():
            report.append(f"\n   {element_type.upper()} Examples:")
            for i, example in enumerate(examples, 1):
                type_info = f" (type='{example['type']}')" if example['type'] else ""
                report.append(f"   {i}. {example['text']}{type_info}")
        
        report.append(f"\n   1.4 Language Usage")
        for pattern, count in entry_structure['language_usage'].items():
            report.append(f"   - {pattern}: {count}")
        
        report.append(f"\n   1.5 Specialized Dictionary Elements")
        for element, count in entry_structure['specialized_elements'].items():
            report.append(f"   - {element}: {count}")
        
        # Cross References Report
        report.append(f"\n\n2. CROSS-REFERENCES")
        report.append(f"   Explicit <xr> elements: {cross_references['explicit_xr']['count']}")
        
        if cross_references['explicit_xr']['types']:
            report.append(f"\n   2.1 Cross-reference Types")
            for xr_type, count in cross_references['explicit_xr']['types'].items():
                report.append(f"   - {xr_type}: {count}")
        
        if cross_references['explicit_xr']['examples']:
            report.append(f"\n   2.2 Cross-reference Examples")
            for i, example in enumerate(cross_references['explicit_xr']['examples'], 1):
                report.append(f"   {i}. {example}")
        
        if cross_references['potential_refs']:
            report.append(f"\n   2.3 Potential Textual Cross-references")
            for ref in cross_references['potential_refs']:
                report.append(f"   - '{ref['term']}': {ref['count']} occurrences")
                if ref['example']:
                    report.append(f"     Example: {ref['example']}")
        
        # Symbols Report
        report.append(f"\n\n3. ALCHEMICAL SYMBOLS")
        report.append(f"   Total <g> elements: {symbols['symbol_count']}")
        report.append(f"   Glyph declarations: {symbols['glyph_declarations']}")
        
        if symbols['common_symbols']:
            report.append(f"\n   3.1 Common Symbols (by reference)")
            for ref, count in symbols['common_symbols'].items():
                report.append(f"   - {ref}: {count}")
    
    return "\n".join(report)

def main():
    """Main function to run the analysis."""
    # Hardcoded paths for specific files we want to analyze
    current_dir = os.getcwd()
    
    # Define paths to the XML files we want to analyze
    ruland_path = os.path.join(current_dir, "Ruland1612", "Ruland.xml")
    sommerhoff_path = os.path.join(current_dir, "Lexikon_Sommerhoff_Mayer2022_slighlyEdited2025-01-08.xml")
    
    files_to_analyze = []
    
    # Check if Ruland file exists
    if os.path.isfile(ruland_path):
        files_to_analyze.append(ruland_path)
    else:
        print(f"Could not find Ruland file at: {ruland_path}")
    
    # Check if Sommerhoff file exists
    if os.path.isfile(sommerhoff_path):
        files_to_analyze.append(sommerhoff_path)
    else:
        print(f"Could not find Sommerhoff file at: {sommerhoff_path}")
    
    # If no files found, check for any XML files in the directory
    if not files_to_analyze:
        print("Specific files not found. Searching for any XML files in current directory...")
        for root, _, files in os.walk(current_dir):
            for file in files:
                if file.endswith('.xml'):
                    files_to_analyze.append(os.path.join(root, file))
                    
    if not files_to_analyze:
        print("No XML files found to analyze.")
        return
    
    # Analyze each file
    analysis_results = []
    for file_path in files_to_analyze:
        result = analyze_tei_file(file_path)
        if result:
            analysis_results.append(result)
    
    # Generate and save the report
    report = generate_report(analysis_results)
    
    # Always save to a file with a timestamp
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    output_file = f"tei_structure_report_{timestamp}.txt"
    
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write(report)
    print(f"Report saved to {output_file}")
    
    # Also print the first part of the report to console
    print("\n--- Report Preview ---")
    preview_lines = report.split('\n')[:30]  # First 30 lines
    print('\n'.join(preview_lines))
    print("...")
    print(f"See {output_file} for the full report.")
    
    # Save raw analysis data as JSON for potential further processing
    json_output = os.path.join(current_dir, f"tei_structure_data_{timestamp}.json")
    with open(json_output, 'w', encoding='utf-8') as f:
        json.dump(analysis_results, f, default=lambda x: list(x) if isinstance(x, (set, tuple)) else x, indent=2)
    
    print(f"Raw analysis data saved to {json_output}")

if __name__ == "__main__":
    main()