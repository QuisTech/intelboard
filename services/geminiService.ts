import { GoogleGenAI, Type } from "@google/genai";
import { Node, Edge } from '@xyflow/react';
import { NodeType } from '../types';

// Initialize Gemini Client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Existing analysis function (Board -> Text)
export const analyzeBoard = async (nodes: Node[], edges: Edge[]) => {
  try {
    const boardData = {
      nodes: nodes.map(n => ({
        type: n.type,
        data: n.data,
        id: n.id
      })),
      edges: edges.map(e => ({
        source: e.source,
        target: e.target,
        label: e.label || 'related to'
      }))
    };

    const prompt = `
      Act as a senior lead detective or intelligence analyst. 
      Analyze the following investigation board data (nodes represent people or events, edges represent connections).
      
      Provide a structured analysis containing:
      1. A brief executive summary of the timeline/network.
      2. Identification of missing intelligence or gaps (what questions should we ask next?).
      3. Key inferred connections that might not be explicitly drawn but are implied by the data.

      Data: ${JSON.stringify(boardData)}
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING },
            gaps: { 
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            connections: { 
              type: Type.ARRAY,
              items: { type: Type.STRING }
            }
          }
        }
      }
    });

    const text = response.text;
    if (!text) return null;
    return JSON.parse(text);

  } catch (error) {
    console.error("Analysis failed:", error);
    throw error;
  }
};

// NEW: Report Translation Function (Text -> Board)
export const parseNarrativeToBoard = async (narrative: string) => {
  try {
    const prompt = `
      Act as an Intelligence Data Encoder. 
      Read the following investigation report/narrative and extract entities and relationships to build a visual investigation board.
      
      Rules:
      1. Identify People and create 'personNode' items. Determine their status (suspect, victim, witness) if possible.
      2. Identify Events, Locations, or Evidence and create 'eventNode' items.
      3. Create relationships (edges) between them.
      
      Narrative: "${narrative}"
      
      Output JSON format matching ReactFlow structure.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            nodes: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  type: { type: Type.STRING, enum: [NodeType.PERSON, NodeType.EVENT] },
                  label: { type: Type.STRING },
                  description: { type: Type.STRING },
                  date: { type: Type.STRING },
                  role: { type: Type.STRING },
                  status: { type: Type.STRING, enum: ['suspect', 'victim', 'witness', 'unknown'] },
                  location: { type: Type.STRING },
                  subtype: { type: Type.STRING, enum: ['event', 'location', 'evidence', 'communication'], description: "The specific category of the event node" },
                  evidenceType: { type: Type.STRING, enum: ['physical', 'digital', 'testimonial', 'forensic'] },
                  amount: { type: Type.NUMBER, description: "Monetary value if applicable" }
                },
                required: ['type', 'label']
              }
            },
            edges: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  source_label: { type: Type.STRING, description: "Label of the source node" },
                  target_label: { type: Type.STRING, description: "Label of the target node" },
                  relation: { type: Type.STRING }
                },
                required: ['source_label', 'target_label']
              }
            }
          }
        }
      }
    });

    const text = response.text;
    if (!text) return null;
    return JSON.parse(text);

  } catch (error) {
    console.error("Narrative parsing failed:", error);
    throw error;
  }
};