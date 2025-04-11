#!/usr/bin/env python3
"""
Improved TEI-XML to JSON Converter for Alchemical Dictionaries

This script converts the TEI-XML dictionaries (Ruland 1612 and Sommerhoff 1701) 
to optimized JSON formats suitable for a static web application.

The script can run without parameters using default file paths, or with custom paths.

Usage:
    python TEI-to-JSON.py 
    
Optional parameters:
    --ruland PATH      : Path to Ruland's XML file (default: looks in common locations)
    --sommerhoff PATH  : Path to Sommerhoff's XML file (default: looks in common locations)
    --output DIR       : Output directory (default: ./output)
    --verbose          : Enable detailed logging
    --help             : Show help message

Dependencies:
    - lxml
    - tqdm (for progress bars)
"""

import argparse
import json
import logging
import os
import re
import sys
import glob
from collections import defaultdict
from datetime import datetime

try:
    from lxml import etree
    from tqdm import tqdm
except ImportError:
    print("Required dependencies not found. Installing...")
    import subprocess
    subprocess.check_call([sys.executable, "-m", "pip", "install", "lxml", "tqdm"])
    from lxml import etree
    from tqdm import tqdm

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler("tei_converter.log"),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger("tei_converter")

# Define TEI namespace
TEI_NS = {"tei": "http://www.tei-c.org/ns/1.0"}

class TeiConverter:
    """Main converter class for processing TEI-XML dictionaries."""
    
    def __init__(self, output_dir="./output"):
        """Initialize the converter with output directory."""
        self.output_dir = output_dir
        if not os.path.exists(output_dir):
            os.makedirs(output_dir)
            logger.info(f"Created output directory: {output_dir}")
    
    def process_ruland(self, filepath):
        """Process Ruland's Lexicon Alchemiae (1612)."""
        if not filepath or not os.path.exists(filepath):
            logger.error(f"Ruland file not found: {filepath}")
            return False
            
        logger.info(f"Processing Ruland's dictionary from: {filepath}")
        try:
            # Parse XML
            tree = etree.parse(filepath)
            root = tree.getroot()
            
            # Extract entries
            entries = root.xpath("//tei:entry", namespaces=TEI_NS)
            logger.info(f"Found {len(entries)} entries in Ruland")
            
            # Process entries
            dictionary_data = self._process_ruland_entries(entries)
            
            # Save main dictionary JSON
            self._save_json(dictionary_data, "ruland_dictionary.json")
            
            # Create letter-based index files
            self._create_letter_indexes(dictionary_data, "ruland")
            
            return True
        except Exception as e:
            logger.error(f"Error processing Ruland dictionary: {str(e)}")
            return False
    
    def process_sommerhoff(self, filepath):
        """Process Sommerhoff's Lexicon pharmaceutico-chymicum (1701)."""
        if not filepath or not os.path.exists(filepath):
            logger.error(f"Sommerhoff file not found: {filepath}")
            return False
            
        logger.info(f"Processing Sommerhoff's dictionary from: {filepath}")
        try:
            # Parse XML
            tree = etree.parse(filepath)
            root = tree.getroot()
            
            # Extract entries
            entries = root.xpath("//tei:entry", namespaces=TEI_NS)
            logger.info(f"Found {len(entries)} entries in Sommerhoff")
            
            # Process entries
            dictionary_data = self._process_sommerhoff_entries(entries)
            
            # Save main dictionary JSON
            self._save_json(dictionary_data, "sommerhoff_dictionary.json")
            
            # Create letter-based index files
            self._create_letter_indexes(dictionary_data, "sommerhoff")
            
            # Extract and save symbol data
            self._extract_sommerhoff_symbols(root)
            
            return True
        except Exception as e:
            logger.error(f"Error processing Sommerhoff dictionary: {str(e)}")
            return False
    
    def _process_ruland_entries(self, entries):
        """Process Ruland dictionary entries."""
        dictionary_data = []
        
        for entry in tqdm(entries, desc="Processing Ruland entries"):
            try:
                entry_id = entry.get("n", "").strip()
                if not entry_id:
                    # Generate an ID if none exists
                    lemma_elem = entry.xpath(".//tei:form[@type='lemma']", namespaces=TEI_NS)
                    if lemma_elem and lemma_elem[0].text:
                        lemma_text = lemma_elem[0].text.strip()
                        entry_id = f"ruland_{self._slugify(lemma_text)}"
                    else:
                        # Skip entries without ID or lemma
                        continue
                
                # Extract lemma
                lemma = ""
                lemma_elem = entry.xpath(".//tei:form[@type='lemma']", namespaces=TEI_NS)
                if lemma_elem:
                    lemma = self._get_element_full_text(lemma_elem[0]).strip()
                
                # Extract variants
                variants = []
                variant_elems = entry.xpath(".//tei:form[@type='variant']", namespaces=TEI_NS)
                for variant in variant_elems:
                    variant_text = self._get_element_full_text(variant).strip()
                    if variant_text:
                        variants.append(variant_text)
                
                # Extract definition
                definition = ""
                sense_elems = entry.xpath(".//tei:sense", namespaces=TEI_NS)
                if sense_elems:
                    definition = self._get_element_full_text(sense_elems[0]).strip()
                
                # Extract German translations
                translations = []
                cit_elems = entry.xpath(".//tei:cit[@type='translation'][@xml:lang='de']//tei:quote", namespaces=TEI_NS)
                for cit in cit_elems:
                    trans_text = self._get_element_full_text(cit).strip()
                    if trans_text:
                        translations.append(trans_text)
                
                # Extract notes
                notes = []
                note_elems = entry.xpath(".//tei:note", namespaces=TEI_NS)
                for note in note_elems:
                    note_text = self._get_element_full_text(note).strip()
                    if note_text:
                        notes.append(note_text)
                
                # Get first letter for indexing
                letter = ""
                if lemma:
                    lemma_clean = lemma.strip()
                    if lemma_clean and lemma_clean[0].isalpha():
                        letter = lemma_clean[0].upper()
                
                # Create entry object
                entry_data = {
                    "id": entry_id,
                    "lemma": lemma,
                    "letter": letter,
                    "variants": variants,
                    "definition": definition,
                    "translations": translations,
                    "notes": notes,
                    "source": "ruland",
                    "xml": etree.tostring(entry, encoding="unicode", pretty_print=True)
                }
                
                dictionary_data.append(entry_data)
                
            except Exception as e:
                logger.warning(f"Error processing Ruland entry: {str(e)}")
                continue
        
        logger.info(f"Successfully processed {len(dictionary_data)} Ruland entries")
        return dictionary_data
    
    def _process_sommerhoff_entries(self, entries):
        """Process Sommerhoff dictionary entries."""
        dictionary_data = []
        
        for entry in tqdm(entries, desc="Processing Sommerhoff entries"):
            try:
                entry_id = entry.get("{http://www.w3.org/XML/1998/namespace}id", "").strip()
                if not entry_id:
                    # Generate an ID if none exists
                    lemma_elem = entry.xpath(".//tei:form[@type='lemma']", namespaces=TEI_NS)
                    if lemma_elem and lemma_elem[0].text:
                        lemma_text = lemma_elem[0].text.strip()
                        entry_id = f"sommerhoff_{self._slugify(lemma_text)}"
                    else:
                        # Skip entries without ID or lemma
                        continue
                
                # Extract lemma
                lemma = ""
                lemma_elem = entry.xpath(".//tei:form[@type='lemma']", namespaces=TEI_NS)
                if lemma_elem:
                    lemma = self._get_element_full_text(lemma_elem[0]).strip()
                
                # Extract variants
                variants = []
                variant_elems = entry.xpath(".//tei:form[@type='variant']", namespaces=TEI_NS)
                for variant in variant_elems:
                    variant_text = self._get_element_full_text(variant).strip()
                    if variant_text:
                        variants.append(variant_text)
                
                # Extract definition
                definition = ""
                sense_elems = entry.xpath(".//tei:sense", namespaces=TEI_NS)
                if sense_elems:
                    definition = self._get_element_full_text(sense_elems[0]).strip()
                
                # Extract German content
                german_text = []
                # Look for German content after <lang>Germ.</lang>
                lang_elems = entry.xpath(".//tei:lang[contains(text(), 'Germ.')]", namespaces=TEI_NS)
                for lang_elem in lang_elems:
                    # Get the parent element
                    parent = lang_elem.getparent()
                    if parent is not None:
                        # Get the text after the <lang> element
                        parent_text = etree.tostring(parent, encoding="unicode", method="text")
                        pattern = r"Germ\.\s*(.*?)(?:$|<)"
                        matches = re.findall(pattern, parent_text)
                        for match in matches:
                            match_text = match.strip()
                            if match_text:
                                german_text.append(match_text)
                
                # Look for German content in <cit> elements
                cit_elems = entry.xpath(".//tei:cit[@xml:lang='de']//tei:quote", namespaces=TEI_NS)
                for cit in cit_elems:
                    cit_text = self._get_element_full_text(cit).strip()
                    if cit_text:
                        german_text.append(cit_text)
                
                # Extract cross-references
                references = []
                xr_elems = entry.xpath(".//tei:xr", namespaces=TEI_NS)
                for xr in xr_elems:
                    ref_elem = xr.xpath(".//tei:ref", namespaces=TEI_NS)
                    if ref_elem:
                        target = ref_elem[0].get("target", "")
                        text = self._get_element_full_text(ref_elem[0]).strip()
                        if target:
                            references.append({
                                "target": target.lstrip("#"),
                                "text": text
                            })
                
                # Extract symbols
                symbols = []
                g_elems = entry.xpath(".//tei:g", namespaces=TEI_NS)
                for g in g_elems:
                    ref = g.get("ref", "").lstrip("#")
                    if ref:
                        symbols.append(ref)
                
                # Get first letter for indexing
                letter = ""
                if lemma:
                    lemma_clean = lemma.strip()
                    if lemma_clean and lemma_clean[0].isalpha():
                        letter = lemma_clean[0].upper()
                
                # Create entry object
                entry_data = {
                    "id": entry_id,
                    "lemma": lemma,
                    "letter": letter,
                    "variants": variants,
                    "definition": definition,
                    "german_text": german_text,
                    "references": references,
                    "symbols": symbols,
                    "source": "sommerhoff",
                    "xml": etree.tostring(entry, encoding="unicode", pretty_print=True)
                }
                
                dictionary_data.append(entry_data)
                
            except Exception as e:
                logger.warning(f"Error processing Sommerhoff entry: {str(e)}")
                continue
        
        logger.info(f"Successfully processed {len(dictionary_data)} Sommerhoff entries")
        return dictionary_data
    
    def _extract_sommerhoff_symbols(self, root):
        """Extract symbol definitions from Sommerhoff dictionary."""
        symbols = {}
        
        # Extract <glyph> elements from the header
        glyph_elems = root.xpath("//tei:glyph", namespaces=TEI_NS)
        logger.info(f"Found {len(glyph_elems)} symbol definitions in Sommerhoff")
        
        for glyph in glyph_elems:
            try:
                symbol_id = glyph.get("{http://www.w3.org/XML/1998/namespace}id", "")
                
                # Extract name
                name = ""
                name_elem = glyph.xpath(".//tei:glyphName", namespaces=TEI_NS)
                if name_elem:
                    name = name_elem[0].text.strip() if name_elem[0].text else ""
                
                # Extract description
                desc = ""
                desc_elem = glyph.xpath(".//tei:desc", namespaces=TEI_NS)
                if desc_elem:
                    desc = self._get_element_full_text(desc_elem[0]).strip()
                
                # Extract Unicode mapping if available
                unicode_mapping = ""
                mapping_elem = glyph.xpath(".//tei:mapping[@type='Unicode']", namespaces=TEI_NS)
                if mapping_elem:
                    unicode_mapping = mapping_elem[0].text.strip() if mapping_elem[0].text else ""
                
                # Create symbol object
                if symbol_id:
                    symbols[symbol_id] = {
                        "id": symbol_id,
                        "name": name,
                        "description": desc,
                        "unicode": unicode_mapping
                    }
                
            except Exception as e:
                logger.warning(f"Error processing symbol definition: {str(e)}")
                continue
        
        # Save symbols to JSON
        self._save_json(symbols, "sommerhoff_symbols.json")
        logger.info(f"Saved {len(symbols)} symbol definitions")
    
    def _create_letter_indexes(self, entries, prefix):
        """Create letter-based index files for faster access."""
        # Group entries by first letter
        letter_groups = defaultdict(list)
        
        for entry in entries:
            letter = entry.get("letter", "").strip()
            if letter and letter.isalpha():
                # Only include essential data in the index
                index_entry = {
                    "id": entry["id"],
                    "lemma": entry["lemma"],
                    "source": entry["source"]
                }
                letter_groups[letter].append(index_entry)
        
        # Save each letter group as a separate file
        for letter, letter_entries in letter_groups.items():
            filename = f"{prefix}_index_{letter.lower()}.json"
            self._save_json(letter_entries, filename)
            logger.info(f"Created index file for letter {letter} with {len(letter_entries)} entries")
        
        # Create a master index of all letters with the expected structure
        letter_index = {
            "letters": {},
            "totalEntries": 0
        }
        
        total_entries = 0
        for letter, letter_entries in letter_groups.items():
            entry_count = len(letter_entries)
            total_entries += entry_count
            
            # Store entry IDs for each letter
            entry_ids = [entry["id"] for entry in letter_entries]
            
            letter_index["letters"][letter] = {
                "count": entry_count,
                "entries": entry_ids
            }
        
        letter_index["totalEntries"] = total_entries
        
        # Save the structured letter index
        self._save_json(letter_index, f"{prefix}_letter_index.json")
        logger.info(f"Created master letter index with {len(letter_groups)} letters and {total_entries} total entries")
    
    def _get_element_full_text(self, element):
        """Extract full text content including child elements."""
        if element is None:
            return ""
        text = " ".join(element.xpath(".//text()"))
        # Clean up whitespace
        text = re.sub(r'\s+', ' ', text)
        return text
    
    def _slugify(self, text):
        """Create a URL-friendly version of a string."""
        text = text.lower()
        text = re.sub(r'[^a-z0-9]+', '_', text)
        text = re.sub(r'_+', '_', text)
        return text.strip('_')
    
    def _save_json(self, data, filename):
        """Save data to a JSON file."""
        filepath = os.path.join(self.output_dir, filename)
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        logger.info(f"Saved JSON to: {filepath}")
    
    def create_metadata(self):
        """Create metadata JSON with dictionary information."""
        metadata = {
            "ruland": {
                "title": "Lexicon Alchemiae",
                "author": "Martin Ruland the Younger",
                "year": 1612,
                "language": "Latin with German translations",
                "description": "A comprehensive alchemical dictionary with scholarly notes and hierarchical lists."
            },
            "sommerhoff": {
                "title": "Lexicon pharmaceutico-chymicum Latino-Germanicum et Germanico-Latinum",
                "author": "Johann Christoph Sommerhoff",
                "year": 1701,
                "language": "Bilingual Latin-German",
                "description": "A bilingual dictionary covering pharmaceutical, alchemical, and botanical terms with extensive symbol usage."
            },
            "generated": datetime.now().isoformat(),
            "version": "1.0.0"
        }
        
        self._save_json(metadata, "dictionary_metadata.json")
        logger.info("Created metadata file")

def find_tei_files():
    """Automatically find TEI-XML files in common locations."""
    ruland_paths = []
    sommerhoff_paths = []
    
    # Common patterns to search for
    ruland_patterns = [
        "./Ruland*.xml",
        "./Ruland*/*.xml",
        "./alchemical-dictionaries/Ruland*/*.xml",
        "../Ruland*.xml",
        "../Ruland*/*.xml",
        "../alchemical-dictionaries/Ruland*/*.xml",
    ]
    
    sommerhoff_patterns = [
        "./Sommerhoff*.xml",
        "./Lexikon_Sommerhoff*.xml",
        "./Sommerhoff*/*.xml",
        "./Lexikon_Sommerhoff*/*.xml",
        "./alchemical-dictionaries/Sommerhoff*/*.xml",
        "./alchemical-dictionaries/Lexikon_Sommerhoff*/*.xml",
        "../Sommerhoff*.xml",
        "../Lexikon_Sommerhoff*.xml",
        "../Sommerhoff*/*.xml",
        "../Lexikon_Sommerhoff*/*.xml",
        "../alchemical-dictionaries/Sommerhoff*/*.xml",
        "../alchemical-dictionaries/Lexikon_Sommerhoff*/*.xml",
    ]
    
    # Search for Ruland files
    for pattern in ruland_patterns:
        matches = glob.glob(pattern)
        ruland_paths.extend(matches)
    
    # Search for Sommerhoff files
    for pattern in sommerhoff_patterns:
        matches = glob.glob(pattern)
        sommerhoff_paths.extend(matches)
    
    # Get the most likely files (largest ones if multiple found)
    ruland_file = None
    if ruland_paths:
        ruland_paths.sort(key=lambda x: os.path.getsize(x) if os.path.exists(x) else 0, reverse=True)
        ruland_file = ruland_paths[0]
    
    sommerhoff_file = None
    if sommerhoff_paths:
        sommerhoff_paths.sort(key=lambda x: os.path.getsize(x) if os.path.exists(x) else 0, reverse=True)
        sommerhoff_file = sommerhoff_paths[0]
    
    return ruland_file, sommerhoff_file

def main():
    """Main entry point for the script."""
    parser = argparse.ArgumentParser(description="Convert TEI-XML dictionaries to JSON")
    parser.add_argument("--ruland", help="Path to Ruland's dictionary XML file")
    parser.add_argument("--sommerhoff", help="Path to Sommerhoff's dictionary XML file")
    parser.add_argument("--output", default="./output", help="Output directory for JSON files")
    parser.add_argument("--verbose", action="store_true", help="Enable verbose logging")
    
    args = parser.parse_args()
    
    if args.verbose:
        logger.setLevel(logging.DEBUG)
    
    # If no file paths provided, try to find them automatically
    ruland_file = args.ruland
    sommerhoff_file = args.sommerhoff
    
    if not ruland_file or not sommerhoff_file:
        auto_ruland, auto_sommerhoff = find_tei_files()
        
        if not ruland_file and auto_ruland:
            ruland_file = auto_ruland
            logger.info(f"Automatically found Ruland file: {ruland_file}")
        
        if not sommerhoff_file and auto_sommerhoff:
            sommerhoff_file = auto_sommerhoff
            logger.info(f"Automatically found Sommerhoff file: {sommerhoff_file}")
    
    # Check if we have at least one file to process
    if not ruland_file and not sommerhoff_file:
        logger.error("No input files found. Please either:")
        logger.error("1. Place XML files in a standard location (./Ruland*.xml, ./Sommerhoff*.xml, etc.)")
        logger.error("2. Specify file paths with --ruland and/or --sommerhoff parameters")
        sys.exit(1)
    
    converter = TeiConverter(args.output)
    
    if ruland_file:
        converter.process_ruland(ruland_file)
    
    if sommerhoff_file:
        converter.process_sommerhoff(sommerhoff_file)
    
    # Create metadata file
    converter.create_metadata()
    
    logger.info("Conversion completed")

if __name__ == "__main__":
    main()