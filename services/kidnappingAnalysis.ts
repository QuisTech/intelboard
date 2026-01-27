import { Node, Edge } from '@xyflow/react';
import { NodeType, InvestigationType, NodeData } from '../types';

export interface KidnappingAnalysis {
  riskAssessment: {
    victimVulnerability: 'HIGH' | 'MEDIUM' | 'LOW';
    kidnapperSophistication: 'HIGH' | 'MEDIUM' | 'LOW';
    likelihoodOfPayment: number; // 0-100%
    estimatedResponseTime: string; // "48-72 hours" etc
  };
  tacticalSuggestions: string[];
  negotiationStrategy: {
    approach: 'HARD' | 'SOFT' | 'STALLING';
    recommendedActions: string[];
    communicationProtocol: string[];
  };
  geographicalAnalysis: {
    hotspotZones: string[];
    possibleHideouts: Array<{
      location: string;
      confidence: number;
      reasoning: string;
    }>;
    escapeRoutes: string[];
  };
  timelineAnalysis: {
    criticalPeriods: Array<{ start: string; end: string; action: string }>;
    patternDetection: string[];
    nextLikelyContact: string;
  };
  resourceAllocation: {
    recommendedUnits: string[]; // ["Police", "DSS", "Military", "Local Vigilante"]
    equipmentNeeded: string[];
    airSupport: boolean;
  };
}

// Main kidnapping analysis function
export const analyzeKidnappingCase = (nodes: Node[], edges: Edge[]): KidnappingAnalysis => {
  // Extract kidnapping-specific nodes
  const victimNodes = nodes.filter(n => (n.data as NodeData).role === 'victim');
  const suspectNodes = nodes.filter(n => (n.data as NodeData).role === 'suspect');
  const locationNodes = nodes.filter(n => n.type === NodeType.EVENT && (n.data as NodeData).location); // Assuming locations are events or have location data
  const communicationNodes = nodes.filter(n => (n.data as NodeData).type === 'communication');
  
  // Nigerian kidnapping patterns database
  const nigerianPatterns = {
    highRiskLGAs: [
      'Bwari', 'Kuje', 'Abaji', 'Kwali', // FCT
      'Birnin Gwari', 'Chikun', 'Kajuru', // Kaduna
      'Marte', 'Mafa', 'Dikwa', // Borno
      'Okpokwu', 'Ado', 'Ogbadibo' // Benue
    ],
    commonHideouts: {
      'Kaduna-Abuja Highway': ['forest_camps', 'abandoned_buildings', 'remote_villages'],
      'Niger State': ['gungu_forest', 'kainji_lake_area', 'zurmi_forest'],
      'Sambisa Region': ['boko_haram_camps', 'mountain_caves', 'border_areas']
    },
    typicalRansomPatterns: [
      { amountRange: [5000000, 20000000], timeframe: '24-48 hours' }, // Express kidnapping
      { amountRange: [20000000, 100000000], timeframe: '3-7 days' }, // Planned kidnapping
      { amountRange: [100000000, 500000000], timeframe: '1-2 weeks' } // High-profile
    ]
  };

  // 1. RISK ASSESSMENT
  const victimVulnerability = calculateVictimVulnerability(victimNodes[0]?.data);
  const kidnapperSophistication = assessKidnapperSophistication(suspectNodes, edges);
  
  // 2. GEOGRAPHICAL ANALYSIS
  const geographicalAnalysis = analyzeGeography(nodes, nigerianPatterns);
  
  // 3. TACTICAL SUGGESTIONS (Nigeria-specific)
  const tacticalSuggestions = generateTacticalSuggestions(victimNodes, suspectNodes, locationNodes);
  
  // 4. NEGOTIATION STRATEGY
  const negotiationStrategy = determineNegotiationStrategy(nodes, communicationNodes);
  
  // 5. TIMELINE ANALYSIS
  const timelineAnalysis = analyzeKidnapTimeline(nodes, edges);
  
  // 6. RESOURCE ALLOCATION
  const resourceAllocation = determineResourcesNeeded(locationNodes, suspectNodes);

  return {
    riskAssessment: {
      victimVulnerability,
      kidnapperSophistication,
      likelihoodOfPayment: calculatePaymentLikelihood(victimNodes[0]?.data),
      estimatedResponseTime: calculateResponseTime(locationNodes)
    },
    tacticalSuggestions,
    negotiationStrategy,
    geographicalAnalysis,
    timelineAnalysis,
    resourceAllocation
  };
};

// Helper Functions for Nigerian Context
function calculateVictimVulnerability(victimData: unknown): 'HIGH' | 'MEDIUM' | 'LOW' {
  if (!victimData) return 'MEDIUM';
  
  const data = victimData as NodeData;
  let score = 0;
  
  // Nigerian-specific vulnerability factors
  if (data.age && data.age < 18) score += 3; // Children high risk
  if (data.age && data.age > 60) score += 2; // Elderly high risk
  if (data.occupation?.toLowerCase().includes('expat')) score += 2;
  if (data.occupation?.toLowerCase().match(/oil|bank|ceo|director/)) score += 2;
  if (data.knownHealthIssues || data.medicalCondition) score += 2;
  
  return score >= 5 ? 'HIGH' : score >= 3 ? 'MEDIUM' : 'LOW';
}

function assessKidnapperSophistication(suspects: Node[], edges: Edge[]): 'HIGH' | 'MEDIUM' | 'LOW' {
  if (suspects.length === 0) return 'MEDIUM';
  
  let sophisticationScore = 0;
  
  suspects.forEach(suspect => {
    const data = suspect.data as NodeData;
    const connections = edges.filter(e => 
      e.source === suspect.id || e.target === suspect.id
    ).length;
    
    // More connections = more organized network
    if (connections > 3) sophisticationScore += 2;
    
    // Check for equipment/technology mentions
    const equipment = data.equipment?.toLowerCase() || '';
    if (equipment.includes('satellite') || equipment.includes('encrypted')) sophisticationScore += 3;
    if (equipment.includes('ak47') || equipment.includes('rpg')) sophisticationScore += 2;
    
    // Previous kidnapping experience
    if (data.priorCases && (data.priorCases as number) > 0) {
      sophisticationScore += (data.priorCases as number);
    }
  });
  
  return sophisticationScore >= 6 ? 'HIGH' : sophisticationScore >= 3 ? 'MEDIUM' : 'LOW';
}

function analyzeGeography(allNodes: Node[], patterns: any) {
  const locationNames: string[] = [];
  allNodes.forEach(n => {
      const data = n.data as NodeData;
      // Safety checks for strings
      if(typeof data.location === 'string' && data.location.trim()) locationNames.push(data.location);
      if(typeof data.label === 'string' && (data.label.includes("Forest") || data.label.includes("LGA"))) locationNames.push(data.label);
  });

  const hotspotZones = locationNames.filter(loc => 
    patterns.highRiskLGAs.some((lga: string) => loc.toLowerCase().includes(lga.toLowerCase()))
  );
  
  const possibleHideouts = hotspotZones.map(zone => {
    // @ts-ignore
    const hideouts = patterns.commonHideouts[zone] || ['unknown_remote_area'];
    return {
      location: zone,
      confidence: 0.7,
      reasoning: `Known kidnapping hotspot with documented cases in past 6 months`
    };
  });
  
  // Add escape route analysis based on Nigerian road networks
  const escapeRoutes = analyzeEscapeRoutes(locationNames);
  
  return {
    hotspotZones,
    possibleHideouts,
    escapeRoutes
  };
}

function analyzeEscapeRoutes(locations: string[]): string[] {
  const routes: string[] = [];
  
  locations.forEach(location => {
    // Nigerian major highways commonly used by kidnappers
    if (location.includes('Abuja')) {
      routes.push('Abuja-Kaduna Expressway', 'Abuja-Lokoja Highway', 'Abuja-Keffi Road');
    }
    if (location.includes('Kaduna')) {
      routes.push('Kaduna-Zaria Road', 'Kaduna-Birnin Gwari Road');
    }
    if (location.includes('Port Harcourt')) {
      routes.push('East-West Road', 'Port Harcourt-Aba Expressway');
    }
  });
  
  return [...new Set(routes)]; // Remove duplicates
}

function generateTacticalSuggestions(victims: Node[], suspects: Node[], locations: Node[]): string[] {
  const suggestions: string[] = [];
  
  // Nigerian law enforcement tactics
  suggestions.push('Deploy DSS technical team for phone tracking');
  
  if (suspects.length > 2) {
    suggestions.push('Consider joint operation with Police Tactical Unit and Military');
  }
  
  if (locations.some(l => {
    const data = l.data as NodeData;
    const label = data.label?.toLowerCase() || '';
    return label.includes('forest') || label.includes('bush');
  })) {
    suggestions.push('Request air surveillance (Police Air Wing or Nigerian Air Force)');
    suggestions.push('Engage local hunters/vigilante for terrain knowledge');
  }
  
  // Check for ransom demands
  // @ts-ignore
  const ransomNode = (victims[0]?.data as any)?.ransomDemand;
  if (ransomNode) {
    suggestions.push('Prepare trained negotiator (preferably native language speaker)');
    suggestions.push('Initiate controlled payment tracking with EFCC Financial Intelligence Unit');
  }
  
  // Time-sensitive actions
  suggestions.push('Activate emergency contact with victim\'s family for updates');
  suggestions.push('Monitor social media for any ransom videos or communications');
  suggestions.push('Coordinate with nearby state police commands for roadblocks');
  
  return suggestions;
}

function determineNegotiationStrategy(nodes: Node[], communications: Node[]) {
  const hasVideoProof = communications.some(c => (c.data as NodeData).medium === 'video');
  const hasDeadline = nodes.some(n => (n.data as NodeData).deadline);
  const groupSuspected = nodes.some(n => (n.data as NodeData).suspectedGroup);
  
  let approach: 'HARD' | 'SOFT' | 'STALLING' = 'STALLING';
  let recommendedActions: string[] = [];
  let communicationProtocol: string[] = [];
  
  if (hasVideoProof) {
    approach = 'SOFT';
    recommendedActions = [
      'Establish communication channel through trusted intermediary',
      'Request proof of life every 12 hours',
      'Negotiate medical access if needed'
    ];
    communicationProtocol = [
      'Use burner phones with 2-hour rotation',
      'All calls recorded and analyzed by DSS technical team',
      'Maintain consistent communicator to build rapport'
    ];
  } else if (hasDeadline) {
    approach = 'STALLING';
    recommendedActions = [
      'Delay payment discussions while gathering intelligence',
      'Request additional proof of life',
      'Engage family spiritual leader for mediation if cultural angle exists'
    ];
  } else {
     recommendedActions = ['Establish proof of life', 'Identify negotiator channel'];
  }
  
  // Nigerian-specific negotiation considerations
  if (groupSuspected) {
    recommendedActions.push('Identify and exploit internal group dynamics');
    recommendedActions.push('Consider amnesty program outreach if applicable');
  }
  
  return { approach, recommendedActions, communicationProtocol };
}

function analyzeKidnapTimeline(nodes: Node[], edges: Edge[]) {
  // Safe Date parsing helper
  const safeTime = (dateStr: any): number => {
      if (!dateStr) return 0;
      const d = new Date(dateStr);
      return isNaN(d.getTime()) ? 0 : d.getTime();
  };

  const events = nodes
    .filter(n => n.type === NodeType.EVENT && (n.data as NodeData).date)
    .sort((a, b) => safeTime((a.data as NodeData).date) - safeTime((b.data as NodeData).date));
  
  const criticalPeriods = [];
  const patterns = [];
  
  // First 24 hours are critical
  if (events.length > 0) {
    const firstEvent = events[0];
    const date = (firstEvent.data as NodeData).date!;
    const t = safeTime(date);
    if (t > 0) {
      criticalPeriods.push({
        start: date,
        end: new Date(t + 24 * 60 * 60 * 1000).toISOString(),
        action: 'Initial response & intelligence gathering'
      });
    }
  }
  
  // Detect patterns common in Nigerian kidnappings
  const hasMultipleVictims = nodes.filter(n => (n.data as NodeData).role === 'victim').length > 1;
  if (hasMultipleVictims) {
    patterns.push('Mass kidnapping pattern - likely organized criminal group');
  }
  
  const hasRoadBlockage = nodes.some(n => {
    const data = n.data as NodeData;
    const desc = data.description?.toLowerCase() || '';
    return desc.includes('road block') || desc.includes('checkpoint');
  });
  if (hasRoadBlockage) {
    patterns.push('Road blockage method used - highway kidnapping modus operandi');
  }
  
  // Calculate next likely contact based on Nigerian patterns
  const lastContact = events.filter(e => 
    (e.data as NodeData).type === 'communication'
  ).pop();
  
  let nextLikelyContact = new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString();
  
  if (lastContact) {
      const dStr = (lastContact.data as NodeData).date;
      const t = safeTime(dStr);
      if (t > 0) {
          nextLikelyContact = new Date(t + 12 * 60 * 60 * 1000).toISOString();
      }
  }
  
  return {
    criticalPeriods,
    patternDetection: patterns,
    nextLikelyContact
  };
}

function determineResourcesNeeded(locations: Node[], suspects: Node[]) {
  const recommendedUnits = ['Police Intelligence Response Team (IRT)'];
  
  // Add specialized units based on location
  if (locations.some(l => {
     const label = (l.data as NodeData).label || '';
     return label.includes('Kaduna') || label.includes('Zamfara');
  })) {
    recommendedUnits.push('Operation Whirl Stroke (OPWS)');
    recommendedUnits.push('Nigerian Army 1 Division');
  }
  
  if (locations.some(l => {
     const label = (l.data as NodeData).label || '';
     return label.includes('Borno') || label.includes('Yobe');
  })) {
    recommendedUnits.push('Joint Task Force (JTF) North East');
    recommendedUnits.push('Civilian JTF');
  }
  
  // Equipment needs
  const equipmentNeeded = [
    'GPS tracking devices',
    'Satellite phones',
    'Night vision goggles',
    'First aid kits'
  ];
  
  if (suspects.some(s => (s.data as NodeData).equipment?.includes('heavy'))) {
    equipmentNeeded.push('Armored vehicles', 'Ballistic shields');
  }
  
  // Air support decision
  const remoteArea = locations.some(l => {
    const label = (l.data as NodeData).label || '';
    return label.includes('forest') || label.includes('bush') || label.includes('mountain');
  });
  
  return {
    recommendedUnits,
    equipmentNeeded,
    airSupport: remoteArea || suspects.length > 3
  };
}

function calculatePaymentLikelihood(victimData: unknown): number {
  if (!victimData) return 50;
  
  const data = victimData as NodeData;
  let likelihood = 50;
  
  // Nigerian-specific factors
  if (data.occupation?.toLowerCase().includes('oil')) likelihood += 20;
  if (data.occupation?.toLowerCase().includes('expat')) likelihood += 15;
  if (data.familyWealth === 'high') likelihood += 25;
  if (data.insurance?.includes('kidnap')) likelihood += 10;
  
  return Math.min(likelihood, 95);
}

function calculateResponseTime(locations: Node[]): string {
  if (!locations.length) return '24-48 hours';
  
  const urbanCenters = ['Lagos', 'Abuja', 'Port Harcourt', 'Kano'];
  const isUrban = locations.some(l => 
    urbanCenters.some(center => (l.data as NodeData).label?.includes(center))
  );
  
  return isUrban ? '2-6 hours' : '12-24 hours';
}