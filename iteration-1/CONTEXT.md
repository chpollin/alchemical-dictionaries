# Alchemical Dictionaries Project - CONTEXT

## Dataset Overview

This project focuses on two digitized and TEI-XML encoded alchemical dictionaries from the early modern period:

1. **Martin Ruland's Lexicon Alchemiae (1612)**
   - Approximately 500 pages
   - Around 3,200 entries (many exceptionally long)
   - Written primarily in Latin with German translations and explanations
   - Dedicated to Heinrich Julius, Duke of Braunschweig and Lüneburg
   - Imperial privilege prohibiting unauthorized reprints for ten years
   - No significant use of alchemical symbols
   - More straightforward for immediate analysis

2. **Johann Christoph Sommerhoff's Lexicon pharmaceutico-chymicum Latino-Germanicum et Germanico-Latinum (1701)**
   - Bilingual dictionary with Latin-German and German-Latin sections
   - Latin-German section: ~12,000 entries across ~400 pages
   - German-Latin section: ~5,500 shorter entries across ~100 pages
   - Contains numerous alchemical symbols (280+ unique symbols identified)
   - Covers pharmaceutical, zoological, botanical, mineralogical, alchemical, and medical terminology
   - Contains extensive symbol usage requiring specialized OCR correction

## Technical Specifications

- **Encoding Framework**: TEI-XML following the TEI dictionary module specifications
- **Text Generation**: Transkribus-based NOSCEMUS GM4 HTR model (specialized for early modern scientific texts)
- **Error Rate**: Character error rate of 0.80% (2-10 character errors per early modern page)
- **Repository Locations**:
  - Zenodo: https://doi.org/10.5281/zenodo.14638445 (permanent archival)
  - GitHub: https://github.com/sarahalang/alchemical-dictionaries (development repository)
- **License**: CC BY (Creative Commons Attribution)
- **Publication Date**: Zenodo (January 13, 2025), GitHub (January 9, 2025)

## Current State of the Data

### Ruland's Lexicon
- **Completion Status**: Basic TEI encoding completed, entries addressable
- **Known Issues**: 
  - Inconsistent entry structures requiring manual correction
  - Some remaining OCR errors, particularly in complex Latin terminology
  - Front and back matter not fully encoded
- **Sample Access Pattern**:
  ```xml
  <entry xml:id="ruland_aqua_fortis">
    <form type="lemma">Aqua fortis</form>
    <sense>
      <def>Nitri spiritus acidus, sive liquor nitri per destillationem...</def>
    </sense>
  </entry>
  ```

### Sommerhoff's Lexicon
- **Completion Status**: Basic dictionary entries encoded, symbol encoding limited to first 22 pages
- **Symbol Encoding Challenges**:
  - Many alchemical symbols lack Unicode equivalents
  - Current approach maps to "Alchemical Symbols" (1F700–1F77F) and "Miscellaneous Symbols" (U+2600–U+26FF) where possible
  - Approximately 20% of symbols require custom solutions
- **OCR Quality**:
  - Generally high quality for text portions (0.80% character error rate)
  - Symbol recognition remains problematic and requires manual correction
- **Sample Access Pattern**:
  ```xml
  <entry xml:id="sommerhoff_mercurius">
    <form type="lemma">Mercurius</form>
    <form type="variant">
      <g ref="#alchemical_mercury"/>
    </form>
    <sense>
      <def>Argentum vivum, hydrargyrum...</def>
    </sense>
  </entry>
  ```

## Research Questions and Potential

### Priority Research Questions (6-12 Month Timeframe)
1. **Comparative Dictionary Analysis**:
   - How do the organizational principles differ between Ruland and Sommerhoff?
   - Can we identify patterns of direct borrowing or influence?
   - How does detail and attention vary across alphabetical sections?

2. **TEI Enhancement (Technical)**:
   - Linking related entries between German-Latin and Latin-German sections
   - Systematic annotation of language switches within entries
   - Comprehensive approach to encoding alchemical symbols

3. **Historical Terminology Evolution**:
   - Tracking specific alchemical concepts across both dictionaries
   - Identifying shifts in definition and usage between 1612 and 1701
   - Measuring relative importance of terms by entry length and detail

### Secondary Research Questions (12-24 Month Timeframe)
1. **Integration with Other Historical Sources**:
   - Connecting dictionary entries to specific alchemical treatises
   - Cross-referencing with other period dictionaries
   - Building a comprehensive network of alchemical terminology

2. **Digital Humanities Tool Development**:
   - Creating specialized visualizations for dictionary comparison
   - Developing search interfaces for non-technical researchers
   - Building annotation tools for collaborative research

## Practical Applications and Implementation

### For Historians and Linguists (Non-Technical Users)
- **Use Case**: Deciphering obscure terminology in alchemical manuscripts
  ```
  Example: Researcher encounters "Leo viridis" in manuscript → Looks up in Ruland's 
  dictionary → Finds definition linking to "green lion" concept → Connects to 
  metallurgical process
  ```

- **Use Case**: Tracing evolution of scientific terminology
  ```
  Example: Comparing definitions of "quintessence" between dictionaries to track 
  conceptual development over time
  ```

### For Digital Humanities Researchers (Technical Users)
- **Use Case**: Training NER models for historical scientific texts
  ```python
  # Example approach using dictionary entries to create training data
  def create_ner_training(tei_file, output_file):
      # Extract lemmas and definitions
      # Format as spaCy training data
      # Write to disk for model training
  ```

- **Use Case**: Visualization of terminological networks
  ```javascript
  // Example concept for network visualization
  function createAlchemicalNetwork(entries) {
    // Extract cross-references between entries
    // Build force-directed graph
    // Display with interactive filters
  }
  ```

### For the LLM-NER Plugin Integration
- Custom plugin allows for:
  - Semi-automated identification of alchemical terms in new texts
  - Human validation interface for correcting AI suggestions
  - Export of validated annotations to standard formats
  - Expected implementation timeline: Q3 2025

## Limitations and Challenges

1. **Data Quality Constraints**:
   - Not comprehensive proofreading quality (suitable for research, not critical editions)
   - Symbol encoding incomplete, especially for Sommerhoff's dictionary
   - Variations in OCR quality across different sections

2. **Interpretive Challenges**:
   - Historical terminology often ambiguous and context-dependent
   - Decknamen (cover names) intentionally cryptic and metaphorical
   - Risk of anachronistic interpretation when applying modern scientific understanding

3. **Technical Hurdles**:
   - No standardized approach for encoding all alchemical symbols
   - Linking related entries across dictionaries requires manual verification
   - Balance between automation and scholarly judgment needed

## Timeline and Milestones

| Phase | Timeframe | Key Deliverables |
|-------|-----------|------------------|
| 1: Current state | Completed | Basic TEI encoding, GitHub/Zenodo repositories, JOHD publication |
| 2: Data enhancement | Q2-Q3 2025 | Refined TEI, complete symbol encoding, cross-referenced entries |
| 3: Analysis tools | Q3-Q4 2025 | NER plugin implementation, visualization interfaces, search tools |
| 4: Comparative analysis | Q1 2026 | Scholarly publications on terminology evolution |
| 5: Expansion | Q2-Q4 2026 | Integration of additional historical dictionaries |

## Target Audiences

1. **Historians of Science and Alchemy**:
   - Primary interest in content and historical context
   - Typically require user-friendly interfaces
   - Focus on specific terms and their evolution

2. **Digital Humanities Specialists**:
   - Interest in methodology and technical implementation
   - Need detailed documentation of encoding decisions
   - May contribute to further tool development

3. **Computational Linguists**:
   - Focus on large-scale pattern analysis
   - Require bulk access to structured data
   - May develop specialized NLP approaches for historical terminology

4. **Cultural Historians**:
   - Interest in broader context of knowledge organization
   - Less concerned with technical details
   - Focus on professional development of early modern science

## Getting Started with the Data

For immediate exploration, we recommend:

1. **For non-technical users**:
   - Browse the GitHub repository's README and documentation
   - Review the JOHD article for context and background
   - Contact the project team for specific term lookups if needed

2. **For technical users**:
   - Clone the repository: `git clone https://github.com/sarahalang/alchemical-dictionaries.git`
   - Explore the TEI files using standard XML tools
   - Refer to documentation for structural conventions
   - Consider contributing to open issues

## Contact and Collaboration

- **Project Lead**: Dr. Sarah Lang, University of Graz
- **GitHub Issues**: For technical questions and contributions
- **Collaboration Opportunities**: We welcome collaborators with expertise in:
  - Historical lexicography
  - TEI encoding and text analysis
  - OCR correction for historical texts
  - Interface design for digital humanities
  - Implementation of NER tools for historical terminology

This document will be updated quarterly as the project progresses. Last update: April 2025.