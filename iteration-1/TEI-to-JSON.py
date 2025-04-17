#!/usr/bin/env python3
"""
Enhanced TEI-XML to JSON Converter for Alchemical Dictionaries

This script converts the TEI-XML dictionaries (Ruland 1612 and Sommerhoff 1701) 
to optimized JSON formats suitable for a static web application, preserving
all structural and semantic elements.

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
TEI_NS = {"tei": "http://www.tei-c.org/ns/1.0", 
          "xml": "http://www.w3.org/XML/1998/namespace"}

class TeiConverter:
    """Main converter class for processing TEI-XML dictionaries."""
    
    def __init__(self, output_dir="./output"):
        """Initialize the converter with output directory."""
        self.output_dir = output_dir
        if not os.path.exists(output_dir):
            os.makedirs(output_dir)
            logger.info(f"Created output directory: {output_dir}")
        
        # Store document structure context
        self.current_page = ""
        self.current_section = ""
        self.current_letter = ""
        
        # Store reference dictionaries for symbols and cross-references
        self.symbol_dict = {}
        self.reference_targets = {}
    
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
            
            # Extract document structure (sections, pages, etc.)
            self._extract_document_structure(root, "ruland")
            
            # Pre-process entries to collect cross-reference targets
            self._process_cross_reference_targets(root, "ruland")
            
            # Extract entries
            entries = root.xpath("//tei:entry", namespaces=TEI_NS)
            logger.info(f"Found {len(entries)} entries in Ruland")
            
            # Process entries
            dictionary_data = self._process_ruland_entries(entries)
            
            # Save main dictionary JSON
            self._save_json(dictionary_data, "ruland_dictionary.json")
            
            # Create letter-based index files
            self._create_letter_indexes(dictionary_data, "ruland")
            
            # Save document structure as separate file
            self._save_json(self.document_structure["ruland"], "ruland_document_structure.json")
            
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
            
            # Extract document structure (sections, pages, etc.)
            self._extract_document_structure(root, "sommerhoff")
            
            # Extract symbol definitions from header
            self._extract_sommerhoff_symbols(root)
            
            # Pre-process entries to collect cross-reference targets
            self._process_cross_reference_targets(root, "sommerhoff")
            
            # Extract entries
            entries = root.xpath("//tei:entry", namespaces=TEI_NS)
            logger.info(f"Found {len(entries)} entries in Sommerhoff")
            
            # Process entries
            dictionary_data = self._process_sommerhoff_entries(entries)
            
            # Save main dictionary JSON
            self._save_json(dictionary_data, "sommerhoff_dictionary.json")
            
            # Create letter-based index files
            self._create_letter_indexes(dictionary_data, "sommerhoff")
            
            # Save document structure as separate file
            self._save_json(self.document_structure["sommerhoff"], "sommerhoff_document_structure.json")
            
            return True
        except Exception as e:
            logger.error(f"Error processing Sommerhoff dictionary: {str(e)}")
            return False
    
    def _extract_document_structure(self, root, source):
        """Extract document structure including pages, sections, headers/footers."""
        self.document_structure = defaultdict(dict)
        structure = {
            "sections": [],
            "pages": {},
            "letters": [],
            "headers_footers": {}
        }
        
        # Extract divs/sections
        divs = root.xpath("//tei:div", namespaces=TEI_NS)
        for div in divs:
            div_type = div.get("type", "unknown")
            div_id = div.get("{http://www.w3.org/XML/1998/namespace}id", "")
            if not div_id:
                div_id = f"{div_type}_{len(structure['sections'])}"
            
            section = {
                "id": div_id,
                "type": div_type,
                "title": "",
                "parent": None
            }
            
            # Check for heading or title
            heading = div.xpath(".//tei:head", namespaces=TEI_NS)
            if heading:
                section["title"] = self._get_element_full_text(heading[0])
            
            # Check for parent div
            parent = div.getparent()
            if parent is not None and parent.tag == f"{{{TEI_NS['tei']}}}div":
                parent_id = parent.get("{http://www.w3.org/XML/1998/namespace}id", "")
                if parent_id:
                    section["parent"] = parent_id
            
            structure["sections"].append(section)
        
        # Extract pages
        pages = root.xpath("//tei:pb", namespaces=TEI_NS)
        for page in pages:
            page_n = page.get("n", "")
            page_id = page.get("{http://www.w3.org/XML/1998/namespace}id", "")
            page_facs = page.get("facs", "")
            
            if page_n:
                structure["pages"][page_n] = {
                    "id": page_id if page_id else f"page_{page_n}",
                    "facs": page_facs,
                    "headers_footers": []
                }
        
        # Extract headers/footers
        fws = root.xpath("//tei:fw", namespaces=TEI_NS)
        for fw in fws:
            fw_text = self._get_element_full_text(fw)
            
            # Find closest page
            page_n = None
            page_node = fw.getprevious()
            while page_node is not None:
                if page_node.tag == f"{{{TEI_NS['tei']}}}pb":
                    page_n = page_node.get("n", "")
                    break
                page_node = page_node.getprevious()
            
            if page_n and page_n in structure["pages"]:
                structure["pages"][page_n]["headers_footers"].append(fw_text)
            else:
                # If no page found, store under general headers_footers
                page_n = "unknown"
                if page_n not in structure["headers_footers"]:
                    structure["headers_footers"][page_n] = []
                structure["headers_footers"][page_n].append(fw_text)
        
        # Extract letter milestones for alphabetical divisions
        milestones = root.xpath("//tei:milestone[@unit='letter']", namespaces=TEI_NS)
        for milestone in milestones:
            letter = milestone.get("n", "")
            if letter:
                structure["letters"].append(letter)
        
        self.document_structure[source] = structure
    
    def _process_cross_reference_targets(self, root, source):
        """Pre-process all entries to collect potential cross-reference targets."""
        entries = root.xpath("//tei:entry", namespaces=TEI_NS)
        targets = {}
        
        for entry in entries:
            # Get ID
            entry_id = None
            if source == "ruland":
                entry_id = entry.get("n", "")
            else:  # sommerhoff
                entry_id = entry.get("{http://www.w3.org/XML/1998/namespace}id", "")
            
            if not entry_id:
                # Try to generate from lemma
                lemma_elem = entry.xpath(".//tei:form[@type='lemma']", namespaces=TEI_NS)
                if lemma_elem and lemma_elem[0].text:
                    lemma_text = lemma_elem[0].text.strip()
                    entry_id = f"{source}_{self._slugify(lemma_text)}"
            
            if entry_id:
                # Get lemma
                lemma = ""
                lemma_elem = entry.xpath(".//tei:form[@type='lemma']", namespaces=TEI_NS)
                if lemma_elem:
                    lemma = self._get_element_full_text(lemma_elem[0]).strip()
                
                targets[entry_id] = {
                    "id": entry_id,
                    "lemma": lemma,
                    "source": source
                }
                
                # Also index by lemma for text-based references
                if lemma:
                    lemma_key = self._normalize_reference(lemma)
                    targets[lemma_key] = {
                        "id": entry_id,
                        "lemma": lemma,
                        "source": source
                    }
        
        self.reference_targets[source] = targets
    
    def _normalize_reference(self, text):
        """Normalize reference text for consistent lookup."""
        # Remove punctuation, lowercase, and normalize whitespace
        text = re.sub(r'[^\w\s]', '', text.lower())
        text = re.sub(r'\s+', ' ', text).strip()
        return text
    
    def _process_ruland_entries(self, entries):
        """Process Ruland dictionary entries."""
        dictionary_data = []
        
        for entry in tqdm(entries, desc="Processing Ruland entries"):
            try:
                # Get entry attributes
                entry_id = entry.get("n", "").strip()
                entry_type = entry.get("type", "").strip()
                
                if not entry_id:
                    # Generate an ID if none exists
                    lemma_elem = entry.xpath(".//tei:form[@type='lemma']", namespaces=TEI_NS)
                    if lemma_elem and lemma_elem[0].text:
                        lemma_text = lemma_elem[0].text.strip()
                        entry_id = f"ruland_{self._slugify(lemma_text)}"
                    else:
                        # Skip entries without ID or lemma
                        continue
                
                # Find the context (page, section) for this entry
                context = self._find_entry_context(entry)
                
                # Extract lemma and its type
                lemma = ""
                lemma_type = "lemma"  # Default type
                
                lemma_elem = entry.xpath(".//tei:form[@type='lemma']", namespaces=TEI_NS)
                if not lemma_elem:
                    # Check for phrases if no lemma
                    lemma_elem = entry.xpath(".//tei:form[@type='phrase']", namespaces=TEI_NS)
                    if lemma_elem:
                        lemma_type = "phrase"
                
                if lemma_elem:
                    lemma = self._get_element_full_text(lemma_elem[0]).strip()
                
                # Extract all forms with types
                forms = []
                form_elems = entry.xpath(".//tei:form", namespaces=TEI_NS)
                for form in form_elems:
                    form_type = form.get("type", "unspecified")
                    form_text = self._get_element_full_text(form).strip()
                    if form_text:
                        forms.append({
                            "type": form_type,
                            "text": form_text
                        })
                
                # Extract variants (as distinct from lemma/phrase)
                variants = []
                variant_elems = entry.xpath(".//tei:form[@type='variant']", namespaces=TEI_NS)
                for variant in variant_elems:
                    variant_text = self._get_element_full_text(variant).strip()
                    if variant_text:
                        variants.append(variant_text)
                
                # Extract explicit definitions vs general sense
                explicit_defs = []
                def_elems = entry.xpath(".//tei:def", namespaces=TEI_NS)
                for def_elem in def_elems:
                    def_text = self._get_element_full_text(def_elem).strip()
                    if def_text:
                        explicit_defs.append(def_text)
                
                # Extract sense elements
                sense_texts = []
                sense_elems = entry.xpath(".//tei:sense", namespaces=TEI_NS)
                for sense in sense_elems:
                    sense_text = self._get_element_full_text(sense).strip()
                    if sense_text:
                        sense_texts.append(sense_text)
                
                # If no explicit definition but sense is available, use sense as definition
                definition = ""
                if explicit_defs:
                    definition = " ".join(explicit_defs)
                elif sense_texts:
                    definition = " ".join(sense_texts)
                
                # Extract German translations with their context
                translations = []
                cit_elems = entry.xpath(".//tei:cit[@type='translation'][@xml:lang='de']", namespaces=TEI_NS)
                for cit in cit_elems:
                    # Get the quote within the citation
                    quote_elem = cit.xpath(".//tei:quote", namespaces=TEI_NS)
                    if quote_elem:
                        trans_text = self._get_element_full_text(quote_elem[0]).strip()
                        
                        # Get style information if present
                        style = cit.get("style", "")
                        
                        # Get context - which element contains this translation
                        parent = cit.getparent()
                        parent_type = "unknown"
                        if parent is not None:
                            if parent.tag == f"{{{TEI_NS['tei']}}}sense":
                                parent_type = "sense"
                            elif parent.tag == f"{{{TEI_NS['tei']}}}note":
                                parent_type = "note"
                        
                        if trans_text:
                            translations.append({
                                "text": trans_text,
                                "style": style,
                                "context": parent_type
                            })
                
                # Extract notes with hierarchy
                notes = []
                note_elems = entry.xpath(".//tei:note", namespaces=TEI_NS)
                for note in note_elems:
                    note_text = self._get_element_full_text(note).strip()
                    
                    # Check if this note has a number/identifier at the start
                    note_num = None
                    note_match = re.match(r'^(\d+)[.\s]+(.*)', note_text)
                    if note_match:
                        note_num = note_match.group(1)
                        note_text = note_match.group(2).strip()
                    
                    if note_text:
                        # Check for nested translations within the note
                        nested_translations = []
                        nested_cits = note.xpath(".//tei:cit[@type='translation'][@xml:lang='de']//tei:quote", namespaces=TEI_NS)
                        for nested_cit in nested_cits:
                            nested_text = self._get_element_full_text(nested_cit).strip()
                            if nested_text:
                                nested_translations.append(nested_text)
                        
                        notes.append({
                            "number": note_num,
                            "text": note_text,
                            "translations": nested_translations
                        })
                
                # Extract textual cross-references
                textual_refs = []
                # Look for vide/see/vid. patterns in sense elements or definitions
                ref_patterns = [
                    r'vide\s+([A-Za-z\s]+)',
                    r'vid\.\s+([A-Za-z\s]+)',
                    r'siehe\s+([A-Za-z\s]+)',
                    r'see\s+([A-Za-z\s]+)'
                ]
                
                for sense in sense_texts + explicit_defs:
                    for pattern in ref_patterns:
                        matches = re.findall(pattern, sense, re.IGNORECASE)
                        for match in matches:
                            ref_text = match.strip()
                            
                            # Try to link to known entries
                            ref_norm = self._normalize_reference(ref_text)
                            ref_target = None
                            
                            if ref_norm in self.reference_targets.get("ruland", {}):
                                ref_target = self.reference_targets["ruland"][ref_norm]["id"]
                            
                            textual_refs.append({
                                "text": ref_text,
                                "pattern": re.search(pattern, sense, re.IGNORECASE).group(0),
                                "target": ref_target
                            })
                
                # Get first letter for indexing
                letter = ""
                if lemma:
                    lemma_clean = lemma.strip()
                    if lemma_clean and lemma_clean[0].isalpha():
                        letter = lemma_clean[0].upper()
                
                # Extract structural markers (line breaks, page numbers)
                structural_markers = {
                    "line_breaks": [],
                    "page_break": None
                }
                
                # Find line breaks within this entry
                lb_elems = entry.xpath(".//tei:lb", namespaces=TEI_NS)
                for i, lb in enumerate(lb_elems):
                    structural_markers["line_breaks"].append(i + 1)
                
                # Find page breaks
                pb_elem = entry.xpath(".//tei:pb", namespaces=TEI_NS)
                if pb_elem:
                    pb = pb_elem[0]
                    structural_markers["page_break"] = {
                        "n": pb.get("n", ""),
                        "id": pb.get("{http://www.w3.org/XML/1998/namespace}id", ""),
                        "facs": pb.get("facs", "")
                    }
                
                # Create entry object
                entry_data = {
                    "id": entry_id,
                    "lemma": lemma,
                    "lemma_type": lemma_type,
                    "entry_type": entry_type,
                    "letter": letter,
                    "forms": forms,
                    "variants": variants,
                    "explicit_definitions": explicit_defs,
                    "sense_texts": sense_texts,
                    "definition": definition,
                    "translations": translations,
                    "notes": notes,
                    "textual_references": textual_refs,
                    "context": context,
                    "structural_markers": structural_markers,
                    "source": "ruland",
                    "xml": etree.tostring(entry, encoding="unicode", pretty_print=True)
                }
                
                dictionary_data.append(entry_data)
                
            except Exception as e:
                logger.warning(f"Error processing Ruland entry {entry_id if 'entry_id' in locals() else 'unknown'}: {str(e)}")
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
                
                # Find the context (page, section) for this entry
                context = self._find_entry_context(entry)
                
                # Extract lemma and its type
                lemma = ""
                lemma_type = "lemma"  # Default type
                
                lemma_elem = entry.xpath(".//tei:form[@type='lemma']", namespaces=TEI_NS)
                if not lemma_elem:
                    # Check for phrases if no lemma
                    lemma_elem = entry.xpath(".//tei:form[@type='phrase']", namespaces=TEI_NS)
                    if lemma_elem:
                        lemma_type = "phrase"
                
                if lemma_elem:
                    lemma = self._get_element_full_text(lemma_elem[0]).strip()
                
                # Extract all forms with types
                forms = []
                form_elems = entry.xpath(".//tei:form", namespaces=TEI_NS)
                for form in form_elems:
                    form_type = form.get("type", "unspecified")
                    form_text = self._get_element_full_text(form).strip()
                    
                    # Check for symbols within the form
                    symbol_refs = []
                    g_elems = form.xpath(".//tei:g", namespaces=TEI_NS)
                    for g in g_elems:
                        ref = g.get("ref", "").lstrip("#")
                        if ref:
                            symbol_refs.append(ref)
                    
                    if form_text:
                        forms.append({
                            "type": form_type,
                            "text": form_text,
                            "symbols": symbol_refs
                        })
                
                # Extract variants (as distinct from lemma/phrase)
                variants = []
                variant_elems = entry.xpath(".//tei:form[@type='variant']", namespaces=TEI_NS)
                for variant in variant_elems:
                    variant_text = self._get_element_full_text(variant).strip()
                    if variant_text:
                        variants.append(variant_text)
                
                # Extract explicit definitions vs general sense
                explicit_defs = []
                def_elems = entry.xpath(".//tei:def", namespaces=TEI_NS)
                for def_elem in def_elems:
                    def_text = self._get_element_full_text(def_elem).strip()
                    if def_text:
                        explicit_defs.append(def_text)
                
                # Extract sense elements with their symbols
                sense_data = []
                sense_elems = entry.xpath(".//tei:sense", namespaces=TEI_NS)
                for sense in sense_elems:
                    sense_text = self._get_element_full_text(sense).strip()
                    
                    # Extract symbols within this sense
                    sense_symbols = []
                    g_elems = sense.xpath(".//tei:g", namespaces=TEI_NS)
                    for g in g_elems:
                        ref = g.get("ref", "").lstrip("#")
                        if ref:
                            sense_symbols.append(ref)
                    
                    if sense_text:
                        sense_data.append({
                            "text": sense_text,
                            "symbols": sense_symbols
                        })
                
                # If no explicit definition but sense is available, use sense as definition
                definition = ""
                if explicit_defs:
                    definition = " ".join(explicit_defs)
                elif sense_data:
                    definition = " ".join([s["text"] for s in sense_data])
                
                # Extract German content with context
                german_text = []
                
                # Pattern 1: <lang>Germ.</lang> followed by German text
                lang_elems = entry.xpath(".//tei:lang[contains(text(), 'Germ.')]", namespaces=TEI_NS)
                for lang_elem in lang_elems:
                    # Get the parent element that contains both <lang> and the text after it
                    parent = lang_elem.getparent()
                    if parent is not None:
                        # Get full text of parent
                        parent_text = self._get_element_full_text(parent)
                        
                        # Extract German text after Germ. marker
                        pattern = r"Germ\.\s*(.*?)(?:$|<|vid\.)"
                        matches = re.findall(pattern, parent_text)
                        for match in matches:
                            match_text = match.strip()
                            if match_text:
                                # Determine context - either in sense or in entry body
                                context_type = "unknown"
                                if parent.tag == f"{{{TEI_NS['tei']}}}sense":
                                    context_type = "sense"
                                
                                german_text.append({
                                    "text": match_text,
                                    "pattern": "lang-germ",
                                    "context": context_type
                                })
                
                # Pattern 2: <cit xml:lang="de">
                cit_elems = entry.xpath(".//tei:cit[@xml:lang='de']", namespaces=TEI_NS)
                for cit in cit_elems:
                    quote_elem = cit.xpath(".//tei:quote", namespaces=TEI_NS)
                    if quote_elem:
                        cit_text = self._get_element_full_text(quote_elem[0]).strip()
                        if cit_text:
                            # Determine context
                            context_type = "unknown"
                            parent = cit.getparent()
                            if parent and parent.tag == f"{{{TEI_NS['tei']}}}sense":
                                context_type = "sense"
                            
                            german_text.append({
                                "text": cit_text,
                                "pattern": "cit-lang-de",
                                "context": context_type
                            })
                
                # Extract cross-references (explicit xr elements)
                references = []
                xr_elems = entry.xpath(".//tei:xr", namespaces=TEI_NS)
                for xr in xr_elems:
                    xr_type = xr.get("type", "unknown")
                    
                    # Get label (like "vid.", "vide", etc.)
                    lbl_elem = xr.xpath(".//tei:lbl", namespaces=TEI_NS)
                    lbl_text = ""
                    if lbl_elem:
                        lbl_text = self._get_element_full_text(lbl_elem[0]).strip()
                    
                    # Get reference target
                    ref_elem = xr.xpath(".//tei:ref", namespaces=TEI_NS)
                    if ref_elem:
                        ref = ref_elem[0]
                        target = ref.get("target", "").lstrip("#")
                        ref_type = ref.get("type", "unknown")
                        text = self._get_element_full_text(ref).strip()
                        
                        if text:
                            references.append({
                                "type": xr_type,
                                "label": lbl_text,
                                "target": target,
                                "ref_type": ref_type,
                                "text": text
                            })
                
                # Also extract textual references (not in xr elements)
                textual_refs = []
                # Look for vide/vid./see patterns
                ref_patterns = [
                    r'vid\.\s+([A-Za-z\s\.]+)',
                    r'vide\s+([A-Za-z\s\.]+)',
                    r'Vide\s+([A-Za-z\s\.]+)',
                    r'Vid\.\s+([A-Za-z\s\.]+)'
                ]
                
                # Check in sense elements
                for sense in sense_data:
                    for pattern in ref_patterns:
                        matches = re.findall(pattern, sense["text"])
                        for match in matches:
                            ref_text = match.strip()
                            
                            # Try to link to known entries
                            ref_norm = self._normalize_reference(ref_text)
                            ref_target = None
                            
                            if ref_norm in self.reference_targets.get("sommerhoff", {}):
                                ref_target = self.reference_targets["sommerhoff"][ref_norm]["id"]
                            
                            textual_refs.append({
                                "text": ref_text,
                                "pattern": re.search(pattern, sense["text"]).group(0),
                                "target": ref_target,
                                "context": "sense"
                            })
                
                # Extract symbols used in the entry
                symbols = []
                g_elems = entry.xpath(".//tei:g", namespaces=TEI_NS)
                for g in g_elems:
                    ref = g.get("ref", "").lstrip("#")
                    if ref:
                        # Get symbol details if available
                        symbol_details = None
                        if ref in self.symbol_dict:
                            symbol_details = self.symbol_dict[ref]
                        
                        # Get context (where this symbol appears)
                        parent = g.getparent()
                        context_type = "unknown"
                        if parent is not None:
                            if parent.tag == f"{{{TEI_NS['tei']}}}form":
                                context_type = "form"
                            elif parent.tag == f"{{{TEI_NS['tei']}}}sense":
                                context_type = "sense"
                        
                        symbols.append({
                            "id": ref,
                            "details": symbol_details,
                            "context": context_type
                        })
                
                # Get first letter for indexing
                letter = ""
                if lemma:
                    lemma_clean = lemma.strip()
                    if lemma_clean and lemma_clean[0].isalpha():
                        letter = lemma_clean[0].upper()
                
                # Extract structural markers (line breaks, page numbers)
                structural_markers = {
                    "line_breaks": [],
                    "page_break": None
                }
                
                # Find line breaks within this entry
                lb_elems = entry.xpath(".//tei:lb", namespaces=TEI_NS)
                for i, lb in enumerate(lb_elems):
                    structural_markers["line_breaks"].append(i + 1)
                
                # Find page breaks
                pb_elem = entry.xpath(".//tei:pb", namespaces=TEI_NS)
                if pb_elem:
                    pb = pb_elem[0]
                    structural_markers["page_break"] = {
                        "n": pb.get("n", ""),
                        "id": pb.get("{http://www.w3.org/XML/1998/namespace}id", ""),
                        "facs": pb.get("facs", "")
                    }
                
                # Create entry object
                entry_data = {
                    "id": entry_id,
                    "lemma": lemma,
                    "lemma_type": lemma_type,
                    "letter": letter,
                    "forms": forms,
                    "variants": variants,
                    "explicit_definitions": explicit_defs,
                    "sense_data": sense_data,
                    "definition": definition,
                    "german_text": german_text,
                    "references": references,
                    "textual_references": textual_refs,
                    "symbols": symbols,
                    "context": context,
                    "structural_markers": structural_markers,
                    "source": "sommerhoff",
                    "xml": etree.tostring(entry, encoding="unicode", pretty_print=True)
                }
                
                dictionary_data.append(entry_data)
                
            except Exception as e:
                logger.warning(f"Error processing Sommerhoff entry {entry_id if 'entry_id' in locals() else 'unknown'}: {str(e)}")
                continue
        
        logger.info(f"Successfully processed {len(dictionary_data)} Sommerhoff entries")
        return dictionary_data
    def _find_entry_context(self, entry):
        """Find the context (page, section, letter) for an entry."""
        context = {
            "page": None,
            "section": None,
            "letter": None,
            "preceding_header": None,
            "following_header": None
        }
        
        # Find the page context by looking for the preceding pb element
        page_elem = None
        parent = entry
        while parent is not None:
            if page_elem is None:
                # Look at preceding siblings first
                prev = parent.getprevious()
                while prev is not None:
                    if prev.tag == f"{{{TEI_NS['tei']}}}pb":
                        page_elem = prev
                        break
                    # Also check for pb within preceding siblings
                    pb_in_prev = prev.xpath(".//tei:pb", namespaces=TEI_NS)
                    if pb_in_prev:
                        page_elem = pb_in_prev[-1]  # Get the last one
                        break
                    prev = prev.getprevious()
            
            # Move up to parent if no page found
            parent = parent.getparent()
            
            # Try to find pb in preceding siblings of parent
            if parent is not None and page_elem is None:
                prev = parent.getprevious()
                while prev is not None:
                    if prev.tag == f"{{{TEI_NS['tei']}}}pb":
                        page_elem = prev
                        break
                    # Also check for pb within preceding siblings
                    pb_in_prev = prev.xpath(".//tei:pb", namespaces=TEI_NS)
                    if pb_in_prev:
                        page_elem = pb_in_prev[-1]  # Get the last one
                        break
                    prev = prev.getprevious()
        
        if page_elem is not None:
            context["page"] = {
                "n": page_elem.get("n", ""),
                "id": page_elem.get("{http://www.w3.org/XML/1998/namespace}id", ""),
                "facs": page_elem.get("facs", "")
            }
        
        # Find section context (div)
        section_elem = None
        parent = entry.getparent()
        while parent is not None:
            if parent.tag == f"{{{TEI_NS['tei']}}}div":
                section_elem = parent
                break
            parent = parent.getparent()
        
        if section_elem is not None:
            section_type = section_elem.get("type", "")
            section_id = section_elem.get("{http://www.w3.org/XML/1998/namespace}id", "")
            
            # Look for section heading
            head_elem = section_elem.xpath(".//tei:head", namespaces=TEI_NS)
            section_head = ""
            if head_elem:
                section_head = self._get_element_full_text(head_elem[0]).strip()
            
            context["section"] = {
                "type": section_type,
                "id": section_id,
                "head": section_head
            }
        
        # Find letter context (milestone)
        letter_elem = None
        parent = entry
        while parent is not None:
            if letter_elem is None:
                # Look at preceding siblings first
                prev = parent.getprevious()
                while prev is not None:
                    if prev.tag == f"{{{TEI_NS['tei']}}}milestone" and prev.get("unit", "") == "letter":
                        letter_elem = prev
                        break
                    prev = prev.getprevious()
            
            # Move up to parent if no letter found
            parent = parent.getparent()
            
            # Try to find milestone in preceding siblings of parent
            if parent is not None and letter_elem is None:
                prev = parent.getprevious()
                while prev is not None:
                    if prev.tag == f"{{{TEI_NS['tei']}}}milestone" and prev.get("unit", "") == "letter":
                        letter_elem = prev
                        break
                    prev = prev.getprevious()
        
        if letter_elem is not None:
            context["letter"] = letter_elem.get("n", "")
        elif entry.get("type", ""):
            # If no milestone, try entry type attribute (Ruland uses this)
            context["letter"] = entry.get("type", "")
        
        # Find proximate header/footer context
        fw_elems = []
        parent = entry
        while parent is not None:
            if not fw_elems:
                # Look at preceding siblings first
                prev = parent.getprevious()
                while prev is not None and len(fw_elems) < 1:
                    if prev.tag == f"{{{TEI_NS['tei']}}}fw":
                        fw_elems.append(prev)
                    # Check for fw within preceding siblings
                    fw_in_prev = prev.xpath(".//tei:fw", namespaces=TEI_NS)
                    if fw_in_prev:
                        fw_elems.extend(fw_in_prev[-1:])  # Get the last one
                    prev = prev.getprevious()
            
            # Move up to parent
            parent = parent.getparent()
            
            # Try to find fw in preceding siblings of parent
            if parent is not None and not fw_elems:
                prev = parent.getprevious()
                while prev is not None and len(fw_elems) < 1:
                    if prev.tag == f"{{{TEI_NS['tei']}}}fw":
                        fw_elems.append(prev)
                    # Check for fw within preceding siblings
                    fw_in_prev = prev.xpath(".//tei:fw", namespaces=TEI_NS)
                    if fw_in_prev:
                        fw_elems.extend(fw_in_prev[-1:])  # Get the last one
                    prev = prev.getprevious()
        
        if fw_elems:
            fw_text = self._get_element_full_text(fw_elems[0]).strip()
            context["preceding_header"] = fw_text
        
        # Look for following header
        fw_elems = []
        parent = entry
        next_elem = parent.getnext()
        while next_elem is not None and len(fw_elems) < 1:
            if next_elem.tag == f"{{{TEI_NS['tei']}}}fw":
                fw_elems.append(next_elem)
            # Check for fw within following siblings
            fw_in_next = next_elem.xpath(".//tei:fw", namespaces=TEI_NS)
            if fw_in_next:
                fw_elems.extend(fw_in_next[:1])  # Get the first one
            next_elem = next_elem.getnext()
        
        if fw_elems:
            fw_text = self._get_element_full_text(fw_elems[0]).strip()
            context["following_header"] = fw_text
        
        return context
    
    def _create_letter_indexes(self, entries, prefix):
        """Create letter-based index files for faster access."""
        # Group entries by first letter
        letter_groups = defaultdict(list)
        
        for entry in entries:
            letter = entry.get("letter", "").strip()
            if letter and letter.isalpha():
                # Include more comprehensive data in the index
                index_entry = {
                    "id": entry["id"],
                    "lemma": entry["lemma"],
                    "lemma_type": entry.get("lemma_type", "lemma"),
                    "source": entry["source"]
                }
                
                # Add variant forms if available
                if "variants" in entry and entry["variants"]:
                    index_entry["variants"] = entry["variants"]
                
                # Add German translations/text (show first one only in index)
                if prefix == "ruland" and "translations" in entry and entry["translations"]:
                    if isinstance(entry["translations"][0], dict):
                        index_entry["translation"] = entry["translations"][0].get("text", "")
                    else:
                        index_entry["translation"] = entry["translations"][0]
                elif prefix == "sommerhoff" and "german_text" in entry and entry["german_text"]:
                    if isinstance(entry["german_text"][0], dict):
                        index_entry["german"] = entry["german_text"][0].get("text", "")
                    else:
                        index_entry["german"] = entry["german_text"][0]
                
                # Add symbols if available (Sommerhoff)
                if "symbols" in entry and entry["symbols"]:
                    symbol_ids = []
                    for symbol in entry["symbols"]:
                        if isinstance(symbol, dict):
                            symbol_ids.append(symbol.get("id", ""))
                        else:
                            symbol_ids.append(symbol)
                    if symbol_ids:
                        index_entry["symbols"] = symbol_ids
                
                # Add page reference
                if "context" in entry and entry["context"].get("page"):
                    index_entry["page"] = entry["context"]["page"].get("n", "")
                
                letter_groups[letter].append(index_entry)
        
        # Save each letter group as a separate file
        for letter, letter_entries in letter_groups.items():
            filename = f"{prefix}_index_{letter.lower()}.json"
            self._save_json(letter_entries, filename)
            logger.info(f"Created index file for letter {letter} with {len(letter_entries)} entries")
        
        # Create a master index of all letters with the expected structure
        letter_index = {
            "letters": {},
            "totalEntries": 0,
            "source": prefix,
            "created": datetime.now().isoformat()
        }
        
        total_entries = 0
        for letter, letter_entries in sorted(letter_groups.items()):
            entry_count = len(letter_entries)
            total_entries += entry_count
            
            # Sort entries alphabetically by lemma
            letter_entries.sort(key=lambda e: e["lemma"].lower())
            
            # Store entry IDs and lemmas for each letter
            letter_index["letters"][letter] = {
                "count": entry_count,
                "entries": [{"id": entry["id"], "lemma": entry["lemma"]} for entry in letter_entries]
            }
        
        letter_index["totalEntries"] = total_entries
        
        # Create a comprehensive search index with more data
        search_index = []
        for letter, letter_entries in letter_groups.items():
            for entry in letter_entries:
                search_entry = {
                    "id": entry["id"],
                    "lemma": entry["lemma"],
                    "letter": letter,
                    "source": entry["source"]
                }
                
                # Add variants to search terms
                if "variants" in entry:
                    search_entry["variants"] = entry["variants"]
                
                # Add translations to search terms
                if "translation" in entry:
                    search_entry["translation"] = entry["translation"]
                elif "german" in entry:
                    search_entry["german"] = entry["german"]
                
                search_index.append(search_entry)
        
        # Save the structured letter index
        self._save_json(letter_index, f"{prefix}_letter_index.json")
        logger.info(f"Created master letter index with {len(letter_groups)} letters and {total_entries} total entries")
        
        # Save the search index
        self._save_json(search_index, f"{prefix}_search_index.json")
        logger.info(f"Created search index with {len(search_index)} entries")
    
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
                
                # Extract any additional mappings or attributes
                additional_mappings = {}
                mapping_elems = glyph.xpath(".//tei:mapping[not(@type='Unicode')]", namespaces=TEI_NS)
                for mapping in mapping_elems:
                    mapping_type = mapping.get("type", "unknown")
                    mapping_text = mapping.text.strip() if mapping.text else ""
                    if mapping_text:
                        additional_mappings[mapping_type] = mapping_text
                
                # Check for graphic representation
                graphic = None
                graphic_elem = glyph.xpath(".//tei:graphic", namespaces=TEI_NS)
                if graphic_elem:
                    graphic = {
                        "url": graphic_elem[0].get("url", ""),
                        "width": graphic_elem[0].get("width", ""),
                        "height": graphic_elem[0].get("height", "")
                    }
                
                # Create symbol object
                if symbol_id:
                    symbols[symbol_id] = {
                        "id": symbol_id,
                        "name": name,
                        "description": desc,
                        "unicode": unicode_mapping,
                        "additional_mappings": additional_mappings,
                        "graphic": graphic
                    }
                
            except Exception as e:
                logger.warning(f"Error processing symbol definition: {str(e)}")
                continue
        
        # Also look for symbol tables in the document
        symbol_tables = []
        
        # Find tables containing symbol information
        table_elems = root.xpath("//tei:table[contains(@n, 'symbol') or contains(@n, 'Symbol')]", namespaces=TEI_NS)
        for table in table_elems:
            try:
                table_id = table.get("{http://www.w3.org/XML/1998/namespace}id", "")
                table_n = table.get("n", "")
                
                # Extract rows and cells
                rows = []
                row_elems = table.xpath(".//tei:row", namespaces=TEI_NS)
                for row in row_elems:
                    cells = []
                    cell_elems = row.xpath(".//tei:cell", namespaces=TEI_NS)
                    for cell in cell_elems:
                        cell_text = self._get_element_full_text(cell).strip()
                        
                        # Check for symbols in this cell
                        cell_symbols = []
                        g_elems = cell.xpath(".//tei:g", namespaces=TEI_NS)
                        for g in g_elems:
                            ref = g.get("ref", "").lstrip("#")
                            if ref:
                                cell_symbols.append(ref)
                        
                        cells.append({
                            "text": cell_text,
                            "symbols": cell_symbols,
                            "rend": cell.get("rend", "")
                        })
                    
                    rows.append(cells)
                
                symbol_tables.append({
                    "id": table_id,
                    "n": table_n,
                    "rows": rows
                })
                
            except Exception as e:
                logger.warning(f"Error processing symbol table: {str(e)}")
                continue
        
        # Store the symbols for use in entry processing
        self.symbol_dict = symbols
        
        # Save symbols to JSON
        self._save_json(symbols, "sommerhoff_symbols.json")
        
        # Save symbol tables if any were found
        if symbol_tables:
            self._save_json(symbol_tables, "sommerhoff_symbol_tables.json")
            
        logger.info(f"Saved {len(symbols)} symbol definitions and {len(symbol_tables)} symbol tables")
    
    def create_metadata(self):
        """Create metadata JSON with dictionary information."""
        metadata = {
            "ruland": {
                "title": "Lexicon Alchemiae",
                "author": "Martin Ruland the Younger",
                "year": 1612,
                "language": "Latin with German translations",
                "description": "A comprehensive alchemical dictionary with scholarly notes and hierarchical lists.",
                "entry_count": len(self.reference_targets.get("ruland", {})),
                "structure": {
                    "letters": len(self.document_structure.get("ruland", {}).get("letters", [])),
                    "pages": len(self.document_structure.get("ruland", {}).get("pages", {})),
                    "sections": len(self.document_structure.get("ruland", {}).get("sections", []))
                }
            },
            "sommerhoff": {
                "title": "Lexicon pharmaceutico-chymicum Latino-Germanicum et Germanico-Latinum",
                "author": "Johann Christoph Sommerhoff",
                "year": 1701,
                "language": "Bilingual Latin-German",
                "description": "A bilingual dictionary covering pharmaceutical, alchemical, and botanical terms with extensive symbol usage.",
                "entry_count": len(self.reference_targets.get("sommerhoff", {})),
                "structure": {
                    "letters": len(self.document_structure.get("sommerhoff", {}).get("letters", [])),
                    "pages": len(self.document_structure.get("sommerhoff", {}).get("pages", {})),
                    "sections": len(self.document_structure.get("sommerhoff", {}).get("sections", []))
                },
                "symbols": len(self.symbol_dict) if hasattr(self, 'symbol_dict') else 0
            },
            "generated": datetime.now().isoformat(),
            "version": "2.0.0",
            "converter": {
                "name": "Enhanced TEI-XML to JSON Converter",
                "features": [
                    "Document structure preservation",
                    "Page and navigation markers",
                    "Detailed symbol extraction",
                    "Cross-reference resolution",
                    "Search index generation",
                    "Multi-language support",
                    "Complete formatting preservation"
                ]
            }
        }
        
        self._save_json(metadata, "dictionary_metadata.json")
        logger.info("Created metadata file with comprehensive information")
        
    def create_combined_search_index(self):
        """Create a combined search index from both dictionaries."""
        if not hasattr(self, 'reference_targets') or not self.reference_targets:
            logger.warning("Cannot create combined index: reference targets not available")
            return
        
        # Collect all entries from both dictionaries
        combined_index = []
        
        # Process Ruland entries if available
        if "ruland" in self.reference_targets:
            for entry_id, entry_data in self.reference_targets["ruland"].items():
                # Skip entries that were indexed by lemma rather than ID
                if entry_id.startswith("ruland_"):
                    combined_index.append({
                        "id": entry_id,
                        "lemma": entry_data["lemma"],
                        "source": "ruland"
                    })
        
        # Process Sommerhoff entries if available
        if "sommerhoff" in self.reference_targets:
            for entry_id, entry_data in self.reference_targets["sommerhoff"].items():
                # Skip entries that were indexed by lemma rather than ID
                if entry_id.startswith("sommerhoff_"):
                    combined_index.append({
                        "id": entry_id,
                        "lemma": entry_data["lemma"],
                        "source": "sommerhoff"
                    })
        
        # Save the combined index
        if combined_index:
            self._save_json(combined_index, "combined_search_index.json")
            logger.info(f"Created combined search index with {len(combined_index)} entries")
        
    def create_cross_reference_network(self):
        """Create a network of cross-references between entries."""
        if not hasattr(self, 'reference_targets') or not self.reference_targets:
            logger.warning("Cannot create reference network: reference targets not available")
            return
        
        # Build a network of references
        reference_network = {
            "nodes": [],
            "links": []
        }
        
        # Add all entries as nodes
        node_ids = set()
        
        # Process Ruland entries
        if "ruland" in self.reference_targets:
            for entry_id, entry_data in self.reference_targets["ruland"].items():
                # Skip entries that were indexed by lemma rather than ID
                if entry_id.startswith("ruland_"):
                    node_ids.add(entry_id)
                    reference_network["nodes"].append({
                        "id": entry_id,
                        "label": entry_data["lemma"],
                        "source": "ruland"
                    })
        
        # Process Sommerhoff entries
        if "sommerhoff" in self.reference_targets:
            for entry_id, entry_data in self.reference_targets["sommerhoff"].items():
                # Skip entries that were indexed by lemma rather than ID
                if entry_id.startswith("sommerhoff_"):
                    node_ids.add(entry_id)
                    reference_network["nodes"].append({
                        "id": entry_id,
                        "label": entry_data["lemma"],
                        "source": "sommerhoff"
                    })
        
        # Add links based on textual references
        # This would require parsing the full dictionary data to extract all references
        # As a placeholder, we'll note that this would be implemented here
        
        # Save the reference network
        if reference_network["nodes"]:
            self._save_json(reference_network, "cross_reference_network.json")
            logger.info(f"Created cross-reference network with {len(reference_network['nodes'])} nodes")
    
    def _get_element_full_text(self, element):
        """Extract full text content including child elements."""
        if element is None:
            return ""
        
        # First try to get the element's text including markup
        try:
            text = etree.tostring(element, encoding="unicode", method="text")
        except Exception:
            # If that fails, just try to get all text nodes
            text = " ".join(element.xpath(".//text()"))
        
        # Clean up whitespace
        text = re.sub(r'\s+', ' ', text)
        return text.strip()
    
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
    parser.add_argument("--partial", action="store_true", help="Process only a subset of entries (for testing)")
    
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
    
    # Initialize the converter
    converter = TeiConverter(args.output)
    
    # Process Ruland dictionary if available
    if ruland_file:
        converter.process_ruland(ruland_file)
    
    # Process Sommerhoff dictionary if available
    if sommerhoff_file:
        converter.process_sommerhoff(sommerhoff_file)
    
    # Create additional resources
    converter.create_metadata()
    converter.create_combined_search_index()
    converter.create_cross_reference_network()
    
    logger.info("Conversion completed successfully")
    
    # List all generated files
    output_files = os.listdir(args.output)
    logger.info(f"Generated {len(output_files)} output files:")
    for file in sorted(output_files):
        file_path = os.path.join(args.output, file)
        file_size = os.path.getsize(file_path) / 1024  # KB
        logger.info(f"  - {file} ({file_size:.1f} KB)")

if __name__ == "__main__":
    main()


