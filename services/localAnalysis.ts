import { Node, Edge } from '@xyflow/react';
import { NodeType, NodeData, AnalysisResult } from '../types';

/**
 * OFFLINE INTELLIGENCE ENGINE (OIE) v2.1 (Stakeholder Edition)
 * 
 * Focus: Plain English outputs, robust gap analysis, and comprehensive coverage.
 */

// --- INTERNAL INTERFACES ---
interface ConditionedData {
  nodes: Node[];
  edges: Edge[];
  chronologicalEvents: Node[];
  entitiesById: Map<string, Node>;
  stats: {
    totalNodes: number;
    totalEdges: number;
    missingDates: number;
    totalAmount: number;
  };
}

interface TrendData {
  direction: 'Increasing Activity' | 'Decreasing Activity' | 'Stable' | 'Sudden Burst';
  eventsPerDay: number;
  timeSpanHours: number;
}

interface ClusterData {
  id: number;
  nodes: Node[];
  dominantType: string;
}

// ============================================================================
// MAIN PIPELINE CONTROLLER
// ============================================================================

export const runLocalAnalysis = (nodes: Node[], edges: Edge[]): any => {
    // 1. Data Preparation
    const conditioned = conditionData(nodes, edges);

    // 2. Risk & Logic Engine
    const heuristics = runHeuristics(conditioned);

    // 3. Timeline Analytics
    const trends = analyzeTrends(conditioned);

    // 4. Network Association (Clustering)
    const clusters = runGraphClustering(conditioned);

    // 5. Special Modules (Finance & Geo)
    const special = runSpecialModules(conditioned);

    // 6. Report Generation
    return generateReport(conditioned, heuristics, trends, clusters, special);
};

// Wrapper for UI
export const generateLocalSummary = (nodes: Node[], edges: Edge[]): AnalysisResult => {
    return runLocalAnalysis(nodes, edges);
};


// ============================================================================
// 1. DATA PREPARATION
// ============================================================================
function conditionData(nodes: Node[], edges: Edge[]): ConditionedData {
    const entitiesById = new Map<string, Node>();
    let missingDates = 0;
    let totalAmount = 0;

    nodes.forEach(n => {
        entitiesById.set(n.id, n);
        const d = n.data as NodeData;
        
        // Normalize amounts (handle strings like "50,000")
        if (d.amount) {
            const val = typeof d.amount === 'string' ? parseFloat(d.amount.replace(/,/g, '')) : d.amount;
            if (!isNaN(val)) totalAmount += val;
        }

        if (n.type === NodeType.EVENT && !d.date) missingDates++;
    });

    const chronologicalEvents = nodes
        .filter(n => n.type === NodeType.EVENT && (n.data as NodeData).date)
        .sort((a, b) => {
            const da = new Date((a.data as NodeData).date!).getTime();
            const db = new Date((b.data as NodeData).date!).getTime();
            return da - db;
        });

    return {
        nodes,
        edges,
        chronologicalEvents,
        entitiesById,
        stats: {
            totalNodes: nodes.length,
            totalEdges: edges.length,
            missingDates,
            totalAmount
        }
    };
}


// ============================================================================
// 2. RISK & LOGIC ENGINE (GAP ANALYSIS)
// ============================================================================
function runHeuristics(data: ConditionedData) {
    const redFlags: any[] = [];
    const gaps: string[] = [];

    // GAP: Isolated Subjects
    data.nodes.filter(n => n.type === NodeType.PERSON).forEach(p => {
        const isConnected = data.edges.some(e => e.source === p.id || e.target === p.id);
        const pData = p.data as NodeData;
        
        if (!isConnected) {
            gaps.push(`Subject '${pData.label}' has no connections. Establish relationships or verify role.`);
        }
        
        // GAP: Missing Biometrics
        if (!pData.image) {
             gaps.push(`Missing photo identification for '${pData.label}'.`);
        }
    });

    // GAP: Suspects without Evidence
    data.nodes.filter(n => (n.data as NodeData).personStatus === 'suspect').forEach(suspect => {
        const connectedIds = data.edges
            .filter(e => e.source === suspect.id || e.target === suspect.id)
            .map(e => e.source === suspect.id ? e.target : e.source);
            
        const hasEvidence = connectedIds.some(id => {
            const node = data.entitiesById.get(id);
            return node && (node.data as any).type === 'evidence';
        });

        if (!hasEvidence) {
            redFlags.push({
                severity: 'HIGH',
                type: 'UNSUBSTANTIATED_SUSPECT',
                message: `Suspect '${(suspect.data as NodeData).label}' is listed without any linked Evidence items.`
            });
            gaps.push(`Link evidence to suspect '${(suspect.data as NodeData).label}' to build a case.`);
        }
    });

    // GAP: Timeline Holes
    if (data.stats.missingDates > 0) {
        gaps.push(`${data.stats.missingDates} events are missing dates. Timeline analysis is incomplete.`);
    }

    // FLAG: Financial Risk
    if (data.stats.totalAmount > 1000000) {
        redFlags.push({
            severity: data.stats.totalAmount > 10000000 ? 'HIGH' : 'MEDIUM',
            type: 'FINANCIAL_VOLUME',
            message: `High volume of financial activity detected (approx. ₦${data.stats.totalAmount.toLocaleString()}).`
        });
    }

    return { redFlags, gaps };
}


// ============================================================================
// 3. TIMELINE ANALYTICS
// ============================================================================
function analyzeTrends(data: ConditionedData): TrendData {
    if (data.chronologicalEvents.length < 2) {
        return { direction: 'Stable', eventsPerDay: 0, timeSpanHours: 0 };
    }

    const first = new Date((data.chronologicalEvents[0].data as NodeData).date!).getTime();
    const last = new Date((data.chronologicalEvents[data.chronologicalEvents.length - 1].data as NodeData).date!).getTime();
    const spanDays = (last - first) / (1000 * 60 * 60 * 24);
    
    // Safety check for same-day events
    const validSpan = spanDays < 1 ? 1 : spanDays;
    const eventsPerDay = data.chronologicalEvents.length / validSpan;

    let direction: TrendData['direction'] = 'Stable';
    
    // Simple burst detection: Are most events recent?
    const midPoint = first + ((last - first) / 2);
    const recentCount = data.chronologicalEvents.filter(n => new Date((n.data as NodeData).date!).getTime() > midPoint).length;
    
    if (recentCount > data.chronologicalEvents.length * 0.7) direction = 'Increasing Activity';
    else if (recentCount < data.chronologicalEvents.length * 0.3) direction = 'Decreasing Activity';
    
    if (eventsPerDay > 3 && validSpan < 2) direction = 'Sudden Burst';

    return {
        direction,
        eventsPerDay,
        timeSpanHours: validSpan * 24
    };
}


// ============================================================================
// 4. NETWORK GROUPS (CLUSTERING)
// ============================================================================
function runGraphClustering(data: ConditionedData): ClusterData[] {
    const visited = new Set<string>();
    const clusters: ClusterData[] = [];
    let clusterId = 1;

    // Adjacency List
    const adj = new Map<string, string[]>();
    data.nodes.forEach(n => adj.set(n.id, []));
    data.edges.forEach(e => {
        adj.get(e.source)?.push(e.target);
        adj.get(e.target)?.push(e.source);
    });

    data.nodes.forEach(node => {
        if (!visited.has(node.id)) {
            const clusterNodes: Node[] = [];
            const queue = [node.id];
            visited.add(node.id);

            while (queue.length > 0) {
                const currId = queue.shift()!;
                const currNode = data.entitiesById.get(currId);
                if (currNode) clusterNodes.push(currNode);

                const neighbors = adj.get(currId) || [];
                neighbors.forEach(neighborId => {
                    if (!visited.has(neighborId)) {
                        visited.add(neighborId);
                        queue.push(neighborId);
                    }
                });
            }

            // Name the group based on content
            let type = 'Mixed Group';
            const people = clusterNodes.filter(n => n.type === NodeType.PERSON);
            if (people.length > 0 && people.length === clusterNodes.length) type = 'Person Network';
            else if (people.length === 0) type = 'Event Sequence';
            else if (people.some(p => (p.data as any).personStatus === 'suspect')) type = 'Suspect Cell';

            clusters.push({
                id: clusterId++,
                nodes: clusterNodes,
                dominantType: type
            });
        }
    });

    // Only return groups with more than 1 item, or singletons if they are significant
    return clusters.filter(c => c.nodes.length > 1 || (c.nodes[0].data as any).personStatus === 'suspect');
}


// ============================================================================
// 5. SPECIAL MODULES (FINANCE & GEO)
// ============================================================================
function runSpecialModules(data: ConditionedData) {
    const financialPatterns = [];
    const locationMap = new Map<string, number>();

    // Geo Analysis
    data.nodes.forEach(n => {
        const d = n.data as NodeData;
        if (d.location) {
            const loc = d.location.trim();
            locationMap.set(loc, (locationMap.get(loc) || 0) + 1);
        }
    });

    const geographicalInsights = Array.from(locationMap.entries())
        .map(([location, count]) => ({
            location,
            activityCount: count,
            significance: count > 2 ? 'High Activity Zone' : 'Known Location'
        }))
        .sort((a, b) => b.activityCount - a.activityCount);

    // Financial Analysis
    if (data.stats.totalAmount > 0) {
        financialPatterns.push({
            description: `Total identified monetary value linked to case.`,
            amount: data.stats.totalAmount,
            type: 'TOTAL_EXPOSURE'
        });
    }

    // Check for individual high transactions
    data.nodes.forEach(n => {
         const d = n.data as NodeData;
         const amt = typeof d.amount === 'string' ? parseFloat(d.amount) : d.amount;
         if (amt && amt > 1000000) {
             financialPatterns.push({
                 description: `Large transaction associated with '${d.label}'`,
                 amount: amt,
                 type: 'HIGH_VALUE_TX'
             });
         }
    });

    return { financialPatterns, geographicalInsights };
}


// ============================================================================
// 6. REPORT GENERATOR (PLAIN ENGLISH)
// ============================================================================
function generateReport(
    data: ConditionedData, 
    heuristics: { redFlags: any[], gaps: string[] },
    trends: TrendData,
    clusters: ClusterData[],
    special: { financialPatterns: any[], geographicalInsights: any[] }
): AnalysisResult {
    
    // Narrative Builder
    let summary = `This investigation board tracks ${data.stats.totalNodes} entities (${data.nodes.filter(n => n.type === NodeType.PERSON).length} people, ${data.nodes.filter(n => n.type === NodeType.EVENT).length} events). `;
    
    summary += `Activity trend is currently '${trends.direction}', occurring at a rate of roughly ${trends.eventsPerDay.toFixed(1)} events per day. `;
    
    if (clusters.length > 1) {
        summary += `The investigation is split into ${clusters.length} separate groups, indicating multiple unrelated incidents or a compartmentalized cell structure. `;
    } else {
        summary += `All entities appear to be connected within a single network. `;
    }

    if (special.financialPatterns.length > 0) {
        summary += `Financial components have been identified, totaling ₦${data.stats.totalAmount.toLocaleString()}. `;
    }

    if (heuristics.redFlags.length > 0) {
        summary += `ATTENTION: ${heuristics.redFlags.length} operational alerts require review. `;
    }

    if (heuristics.gaps.length > 0) {
        summary += `There are ${heuristics.gaps.length} missing intelligence items identified. `;
    }

    // Formatting for UI
    const connections = clusters.map(c => {
        const names = c.nodes.slice(0, 3).map(n => (n.data as NodeData).label).join(', ');
        const extra = c.nodes.length > 3 ? ` (+${c.nodes.length - 3} others)` : '';
        return `Group ${c.id} (${c.dominantType}): ${names}${extra}`;
    });

    return {
        summary,
        gaps: heuristics.gaps,
        redFlags: heuristics.redFlags,
        connections: connections,
        clusters: clusters.map(c => ({
            id: c.id,
            label: `Group ${c.id}`,
            members: c.nodes.map(n => (n.data as NodeData).label)
        })),
        temporalTrend: {
            direction: trends.direction,
            velocity: `${trends.eventsPerDay.toFixed(1)} / day`
        },
        financialPatterns: special.financialPatterns,
        geographicalInsights: special.geographicalInsights,
        stats: {
            totalEntities: data.stats.totalNodes,
            unverifiedSources: 0,
            missingTimestamps: data.stats.missingDates
        }
    };
}