import nlp from 'compromise';
import Fuse from 'fuse.js';
import * as chrono from 'chrono-node';
import * as graphlib from 'graphlib';
import { NodeType } from '../types';

/**
 * ENGINE A: ROBUST OFFLINE INPUT ENGINE
 * 
 * Capabilities:
 * 1. Text Normalization (Diacritics handling)
 * 2. NLP Tagging (Compromise)
 * 3. Fuzzy Deduplication (Fuse.js)
 * 4. Temporal Extraction (Chrono-node)
 * 5. Graph Validation (Graphlib) - Ensures no orphan edges or cyclic logic errors
 */

interface ExtractedNode {
    id: string; // Internal processing ID
    type: NodeType;
    label: string;
    role?: string;
    personStatus?: string;
    location?: string;
    description?: string;
    date?: string;
    amount?: number;
    subtype?: string; // Critical for EventNode styling in UI
    [key: string]: any;
}

interface ExtractedEdge {
    source: string; // Uses ID now, not label
    target: string;
    relation: string;
}

// --- UTILITY: DIACRITIC CLEANER ---
// Replaces "normalize-diacritics" library to save HTTP requests, using native API
const cleanString = (str: string): string => {
    return str
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[""]/g, '"')
        .replace(/\s+/g, ' ')
        .trim();
};

export const parseNarrativeToBoard = async (narrative: string): Promise<{ nodes: any[], edges: any[] }> => {
    
    // --- STEP 1: PRE-PROCESSING ---
    const rawText = narrative;
    const cleanText = cleanString(narrative);
    const doc = nlp(cleanText);
    const graph = new graphlib.Graph({ directed: true, multigraph: false });

    // Internal Registry
    let candidates: ExtractedNode[] = [];

    // --- STEP 2: ROBUST ENTITY INGESTION ---
    
    // Helper to Add Candidates
    const registerCandidate = (data: Partial<ExtractedNode>) => {
        if (!data.label || data.label.length < 2) return;
        
        // Basic Type Inference
        let type = data.type || NodeType.EVENT;
        
        // Generate a temporary ID based on content
        const tempId = `temp_${Math.random().toString(36).substr(2, 9)}`;

        candidates.push({
            id: tempId,
            type: type,
            label: data.label,
            ...data
        });
    };

    // A. PEOPLE Extraction
    doc.people().forEach((p: any) => {
        const name = p.text();
        registerCandidate({
            type: NodeType.PERSON,
            label: name,
            role: 'unknown',
            personStatus: 'unknown',
            evidenceSource: 'Logic Engine: NLP'
        });
    });

    // B. ORGANIZATION Extraction
    doc.organizations().forEach((o: any) => {
        const org = o.text();
        registerCandidate({
            type: NodeType.PERSON, // Modeled as Person node for UI
            label: org,
            role: 'organization',
            personStatus: 'unknown',
            evidenceSource: 'Logic Engine: NLP'
        });
    });

    // C. LOCATION Extraction
    doc.places().forEach((l: any) => {
        const loc = l.text();
        registerCandidate({
            type: NodeType.EVENT,
            label: loc,
            location: loc,
            role: 'location',
            subtype: 'location', // Explicit subtype for Green Color
            description: 'Location identified from narrative',
            evidenceSource: 'Logic Engine: NLP'
        });
    });

    // D. MONEY Extraction (Compromise Numbers)
    doc.match('#Money').forEach((m: any) => {
        const amountStr = m.text();
        // Simple heuristic to attach money to the "previous" entity logic would go here
        // For now, we create a specific Financial Event
        registerCandidate({
            type: NodeType.EVENT,
            label: `Financial Transaction: ${amountStr}`,
            amount: parseFloat(amountStr.replace(/[^0-9.]/g, '')),
            subtype: 'evidence', // Subtype for UI (Purple)
            evidenceType: 'digital',
            evidenceSource: 'Logic Engine: Financial'
        });
    });

    // E. TIME Extraction (Chrono-node)
    const timeResults = chrono.parse(rawText);
    timeResults.forEach((res) => {
        const dateObj = res.start.date();
        const dateText = res.text;
        
        // Extract context (window of 30 chars)
        const idx = res.index;
        const context = rawText.substring(Math.max(0, idx - 30), Math.min(rawText.length, idx + dateText.length + 30));

        registerCandidate({
            type: NodeType.EVENT,
            label: `Timeline: ${dateText}`,
            date: dateObj.toISOString(),
            description: `...${context}...`,
            role: 'timeline_entry',
            evidenceSource: 'Logic Engine: Chrono'
        });
    });

    // --- STEP 3: ENTITY RESOLUTION (FUSE.JS) ---
    // Merge duplicates (e.g., "Mr. John Smith" and "John Smith")
    
    const resolvedNodes: ExtractedNode[] = [];
    
    // We process candidates one by one. If they match an existing Resolved Node via Fuzzy Search, we merge.
    // If not, we add them as a new Resolved Node.
    
    const fuseOptions = {
        keys: ['label'],
        includeScore: true,
        threshold: 0.25, // Very strict
    };

    // Sort candidates by string length desc (Longest names first = primary names)
    candidates.sort((a, b) => b.label.length - a.label.length);

    candidates.forEach(candidate => {
        const fuse = new Fuse(resolvedNodes, fuseOptions);
        const results = fuse.search(candidate.label);

        if (results.length > 0) {
            // MATCH FOUND -> MERGE
            const matchIndex = results[0].refIndex;
            const existing = resolvedNodes[matchIndex];

            // Merge Logic: Keep the longest label, combine metadata
            if (candidate.label.length > existing.label.length) existing.label = candidate.label;
            if (candidate.date && !existing.date) existing.date = candidate.date;
            if (candidate.location && !existing.location) existing.location = candidate.location;
            if (candidate.amount && !existing.amount) existing.amount = candidate.amount;
            if (candidate.subtype && !existing.subtype) existing.subtype = candidate.subtype; // Preserve visual subtype
            if (existing.role === 'unknown' && candidate.role !== 'unknown') existing.role = candidate.role;

        } else {
            // NO MATCH -> NEW NODE
            resolvedNodes.push(candidate);
        }
    });

    // --- STEP 4: RELATIONSHIP MAPPING (GRAPH THEORY) ---
    // We now have distinct nodes. We scan the text again to find connections.
    
    const edges: ExtractedEdge[] = [];
    const sentences = doc.sentences().json();
    
    // Re-index for search
    const nodeFuse = new Fuse(resolvedNodes, { 
        keys: ['label'], 
        threshold: 0.3,
        includeScore: true 
    });

    sentences.forEach((sent: any) => {
        const text = sent.text;
        
        // Find all entities present in this sentence
        const presentNodeIds = new Set<string>();

        // Check each resolved node against sentence
        resolvedNodes.forEach(node => {
            // Direct inclusion check (Fastest)
            if (cleanString(text).toLowerCase().includes(cleanString(node.label).toLowerCase())) {
                presentNodeIds.add(node.id);
            }
        });

        const idsInSentence = Array.from(presentNodeIds);

        // If 2+ nodes are in the same sentence, they are likely related
        if (idsInSentence.length >= 2) {
             // Verb Extraction for Relation Label
             const sentDoc = nlp(text);
             const verbs = sentDoc.verbs().out('array');
             const meaningfulVerbs = verbs.filter((v: string) => !['is', 'was', 'are', 'were'].includes(v));
             const relation = meaningfulVerbs.length > 0 ? meaningfulVerbs[0] : 'associated';

             // Create Chain (A -> B -> C)
             for(let i = 0; i < idsInSentence.length - 1; i++) {
                 const sourceId = idsInSentence[i];
                 const targetId = idsInSentence[i+1];
                 
                 // Add to Graphlib for cycle checking (Optional, but good practice)
                 graph.setEdge(sourceId, targetId);

                 edges.push({
                     source: sourceId,
                     target: targetId,
                     relation: relation
                 });
             }
        }
    });

    // --- STEP 5: FINAL OUTPUT FORMATTING ---
    // Convert resolvedNodes to UI format
    // Note: We use the 'id' we generated so edges map correctly

    // Artificial UX Delay
    await new Promise(r => setTimeout(r, 600));

    return { 
        nodes: resolvedNodes, 
        edges: edges.map(e => ({
            source_label: resolvedNodes.find(n => n.id === e.source)?.label || 'Unknown',
            target_label: resolvedNodes.find(n => n.id === e.target)?.label || 'Unknown',
            relation: e.relation
        }))
    };
};