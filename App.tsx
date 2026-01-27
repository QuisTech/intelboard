import React, { useCallback, useRef, useState, useEffect } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  addEdge,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  Connection,
  Edge,
  Node,
  BackgroundVariant,
  useReactFlow,
  Panel,
} from '@xyflow/react';
import { jsPDF } from "jspdf";

import { Sidebar } from './components/Sidebar';
import { EditorPanel } from './components/EditorPanel';
import { DirectorMode } from './components/DirectorMode';
import { LoginScreen } from './components/LoginScreen';
import { EventNode, PersonNode, NoteNode, DeletableEdge } from './components/CustomNodes';
import { NodeType, AnalysisResult, InvestigationType, NodeData } from './types';
import { analyzeBoard } from './services/geminiService'; 
import { parseNarrativeToBoard } from './services/offlineNLP'; 
import { analyzeKidnappingCase, KidnappingAnalysis } from './services/kidnappingAnalysis';
import { generateLocalSummary } from './services/localAnalysis';
import { KidnappingDashboard } from './components/KidnappingDashboard';
import { 
  BrainCircuit, 
  Loader2, 
  Sparkles, 
  AlertTriangle, 
  Link2, 
  ShieldAlert, 
  Crown, 
  MapPin, 
  Undo2, 
  Redo2, 
  Briefcase, 
  CheckCircle2, 
  Radio, 
  Download, 
  Upload, 
  Cpu, 
  Trash2, 
  AlertCircle,
  X,
  FileDown,
  Wifi,
  WifiOff,
  FolderOpen,
  Save,
  Clock,
  Wand2,
  FileText,
  ClipboardList
} from 'lucide-react';

// Define custom node types outside component to prevent re-creation
const nodeTypes = {
  [NodeType.EVENT]: EventNode,
  [NodeType.PERSON]: PersonNode,
  [NodeType.NOTE]: NoteNode,
};

// Define custom edge types
const edgeTypes = {
  deletable: DeletableEdge,
};

// Generate unique ID based on timestamp and random string to prevent collisions after reload
const getId = () => `dndnode_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

// Interface for History
interface HistoryState {
  nodes: Node[];
  edges: Edge[];
}

// Interface for Saved Case
interface SavedCase {
  id: string;
  name: string;
  date: number;
  nodeCount: number;
  data: {
    nodes: Node[];
    edges: Edge[];
    investigationType?: InvestigationType;
    manualMode?: InvestigationType | 'AUTO';
  }
}

const InvestigationCanvas = ({ onLogout }: { onLogout: () => void }) => {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // INITIAL STATE: Preset kidnapping scenario
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([
    {
      id: '1',
      type: NodeType.PERSON,
      position: { x: 400, y: 100 },
      data: { 
        label: 'Dr. Amara Okeke', 
        role: 'victim',
        age: 45,
        occupation: 'Oil Executive',
        medicalCondition: 'Hypertension',
        abductionTime: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 24 hours ago
        evidenceSource: 'Family Report',
      },
    },
    {
      id: '2',
      type: NodeType.EVENT,
      position: { x: 400, y: 300 },
      data: { 
        label: 'Abduction at Lekki', 
        type: 'event',
        date: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
        location: 'Lekki Phase 1',
        evidenceSource: 'CCTV Footage',
        coordinates: { lat: 6.4500, lng: 3.4500 }
      },
    },
    {
      id: '3',
      type: NodeType.EVENT,
      position: { x: 700, y: 300 },
      data: { 
        label: 'Ransom Call', 
        type: 'communication',
        date: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 hours ago
        amount: 50000000,
        deadline: new Date(Date.now() + 1000 * 60 * 60 * 48).toISOString(), // 48 hours from now
        evidenceSource: 'Recorded Call #001'
      },
    },
  ]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([
    { id: 'e1-2', source: '1', target: '2', label: 'Abducted at', type: 'deletable', animated: true, style: { stroke: '#ef4444', strokeWidth: 2 } },
    { id: 'e1-3', source: '1', target: '3', label: 'Subject of', type: 'deletable', animated: true, style: { stroke: '#eab308', strokeWidth: 2 } },
  ]);
  
  const { screenToFlowPosition, setViewport } = useReactFlow();
  
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<Edge | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  // NEW: Separate visibility state for bottom panel to prevent clearing analysis on close
  const [showAnalysisPanel, setShowAnalysisPanel] = useState(false);
  
  // Analysis Options State
  const [showAnalysisOptions, setShowAnalysisOptions] = useState(false);

  // New Report Visualizer State
  const [showReportInput, setShowReportInput] = useState(false);
  const [reportText, setReportText] = useState("");
  const [isGeneratingBoard, setIsGeneratingBoard] = useState(false);

  // Save/Load Manager State
  const [showSaveLoadModal, setShowSaveLoadModal] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [savedCases, setSavedCases] = useState<SavedCase[]>([]);

  // Investigation Mode State
  const [manualMode, setManualMode] = useState<InvestigationType | 'AUTO'>('AUTO');
  const [investigationType, setInvestigationType] = useState<InvestigationType>(InvestigationType.GENERAL);
  
  const [kidnapAnalysis, setKidnapAnalysis] = useState<KidnappingAnalysis | null>(null);
  const [showFullAnalysis, setShowFullAnalysis] = useState(false);
  
  // VISIBILITY STATE FOR DIRECTOR MODE
  const [showDirectorMode, setShowDirectorMode] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Simulation / Toast State
  const [simulationToast, setSimulationToast] = useState<{message: string, type: 'info' | 'success'} | null>(null);

  // --- HISTORY MANAGEMENT ---
  const [past, setPast] = useState<HistoryState[]>([]);
  const [future, setFuture] = useState<HistoryState[]>([]);

  // --- PERSISTENCE & EXPORT ---
  useEffect(() => {
    const saveData = { nodes, edges };
    localStorage.setItem('intelboard_autosave', JSON.stringify(saveData));
  }, [nodes, edges]);

  // Load saved cases when modal opens
  useEffect(() => {
    if (showSaveLoadModal) {
      try {
        const stored = localStorage.getItem('intelboard_saved_cases');
        if (stored) {
          setSavedCases(JSON.parse(stored));
        }
      } catch (e) {
        console.error("Failed to load saved cases", e);
      }
    }
  }, [showSaveLoadModal]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('mode') === 'director') {
      setShowDirectorMode(true);
    }
  }, []);

  const handleSaveToBrowser = () => {
    if (!saveName.trim()) return;
    
    const newCase: SavedCase = {
      id: Date.now().toString(),
      name: saveName,
      date: Date.now(),
      nodeCount: nodes.length,
      data: {
        nodes,
        edges,
        investigationType,
        manualMode
      }
    };

    const updatedCases = [newCase, ...savedCases];
    setSavedCases(updatedCases);
    localStorage.setItem('intelboard_saved_cases', JSON.stringify(updatedCases));
    setSaveName("");
    setSimulationToast({ message: 'Project Saved Successfully', type: 'success' });
    setTimeout(() => setSimulationToast(null), 2000);
  };

  const handleLoadFromBrowser = (caseItem: SavedCase) => {
    takeSnapshot();
    setNodes(caseItem.data.nodes);
    setEdges(caseItem.data.edges);
    if (caseItem.data.manualMode) setManualMode(caseItem.data.manualMode);
    
    // Clear previous analysis to avoid confusion, or let user re-run it
    setAnalysis(null);
    setShowAnalysisPanel(false);

    setShowSaveLoadModal(false);
    setSimulationToast({ message: `Loaded "${caseItem.name}"`, type: 'success' });
    setTimeout(() => setSimulationToast(null), 2000);
  };

  const handleDeleteSavedCase = (id: string) => {
    const updated = savedCases.filter(c => c.id !== id);
    setSavedCases(updated);
    localStorage.setItem('intelboard_saved_cases', JSON.stringify(updated));
  };

  const handleExportCase = () => {
    const dataStr = JSON.stringify({ nodes, edges, investigationType }, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `case-export-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setSimulationToast({ message: 'Case File Saved Successfully', type: 'success' });
    setTimeout(() => setSimulationToast(null), 3000);
  };

  // --- UPGRADED PDF GENERATOR ---
  const handleDownloadPDF = () => {
    const currentAnalysis = generateLocalSummary(nodes, edges);
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    const contentWidth = pageWidth - (margin * 2);
    let yPos = 20;

    const caseId = `CASE-${Date.now().toString().slice(-6)}`;
    const dateStr = new Date().toLocaleString();

    // Helper: Add Page Check
    const checkPageBreak = (heightNeeded: number) => {
      if (yPos + heightNeeded > pageHeight - margin) {
        doc.addPage();
        yPos = 20;
        addHeader();
      }
    };

    // Helper: Add Header/Footer
    const addHeader = () => {
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(`CONFIDENTIAL // LAW ENFORCEMENT SENSITIVE`, margin, 10);
      doc.text(`CASE ID: ${caseId}`, pageWidth - margin, 10, { align: 'right' });
    };

    const addFooter = () => {
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(`Generated by IntelBoard Logic Engine`, margin, pageHeight - 10);
        doc.text(`Page ${i} of ${pageCount}`, pageWidth - margin, pageHeight - 10, { align: 'right' });
      }
    };

    // Helper: Wrap Text
    const addWrappedText = (text: string, y: number, fontSize: number = 10, isBold: boolean = false, color: [number, number, number] = [60, 60, 60]) => {
      doc.setFontSize(fontSize);
      doc.setFont("helvetica", isBold ? "bold" : "normal");
      doc.setTextColor(...color);
      const lines = doc.splitTextToSize(text, contentWidth);
      doc.text(lines, margin, y);
      return y + (lines.length * (fontSize / 2.5)) + 4;
    };

    // --- TITLE PAGE ---
    addHeader();
    doc.setFontSize(24);
    doc.setTextColor(40, 40, 40);
    doc.text("INTELLIGENCE DOSSIER", pageWidth / 2, 50, { align: 'center' });
    
    doc.setFontSize(14);
    doc.setTextColor(100, 100, 100);
    doc.text(`Investigation Report: ${caseId}`, pageWidth / 2, 60, { align: 'center' });
    doc.text(`Date Generated: ${dateStr}`, pageWidth / 2, 68, { align: 'center' });
    
    doc.setLineWidth(0.5);
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, 80, pageWidth - margin, 80);

    yPos = 90;
    checkPageBreak(60);
    doc.setFillColor(240, 242, 245);
    doc.rect(margin, yPos, contentWidth, 35, 'F');
    doc.setTextColor(40, 40, 40);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("EXECUTIVE SUMMARY", margin + 5, yPos + 10);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(60, 60, 60);
    const summaryLines = doc.splitTextToSize(currentAnalysis.summary, contentWidth - 10);
    doc.text(summaryLines, margin + 5, yPos + 18);
    yPos += 45;

    // --- CRITICAL ALERTS ---
    if (currentAnalysis.redFlags.length > 0) {
      checkPageBreak(50);
      doc.setFontSize(12);
      doc.setTextColor(180, 0, 0); 
      doc.setFont("helvetica", "bold");
      doc.text(`OPERATIONAL WARNINGS`, margin, yPos);
      yPos += 8;
      
      currentAnalysis.redFlags.forEach((flag) => {
        checkPageBreak(20);
        doc.setFontSize(10);
        doc.setTextColor(40, 40, 40);
        doc.setFont("helvetica", "bold");
        doc.text(`[${flag.severity}] ${flag.type.replace(/_/g, ' ')}`, margin, yPos);
        yPos += 5;
        doc.setFont("helvetica", "normal");
        yPos = addWrappedText(flag.message, yPos);
        yPos += 2;
      });
      yPos += 10;
    }

    // --- SUBJECT PROFILES (IMAGES) ---
    const subjects = nodes.filter(n => n.type === NodeType.PERSON);
    if (subjects.length > 0) {
      doc.addPage();
      yPos = 20;
      addHeader();
      
      doc.setFontSize(14);
      doc.setTextColor(0, 0, 0);
      doc.setFont("helvetica", "bold");
      doc.text("SUBJECT PROFILES", margin, yPos);
      yPos += 10;

      subjects.forEach((sub) => {
        const d = sub.data as NodeData;
        checkPageBreak(50); // Reserve space for a card
        
        // Card Background
        doc.setFillColor(250, 250, 250);
        doc.setDrawColor(220, 220, 220);
        doc.rect(margin, yPos, contentWidth, 45, 'FD');

        // Image Handling
        if (d.image) {
          try {
            // Aspect ratio management could be added here, assuming square/standard for now
            doc.addImage(d.image, 'JPEG', margin + 2, yPos + 2, 40, 40);
          } catch (e) {
            doc.rect(margin + 2, yPos + 2, 40, 40, 'S');
            doc.setFontSize(8);
            doc.text("IMG ERR", margin + 12, yPos + 22);
          }
        } else {
          doc.rect(margin + 2, yPos + 2, 40, 40, 'S');
          doc.setFontSize(8);
          doc.setTextColor(150, 150, 150);
          doc.text("NO PHOTO", margin + 10, yPos + 22);
        }

        // Text Details
        const textX = margin + 45;
        let textY = yPos + 8;
        
        doc.setFontSize(12);
        doc.setTextColor(0, 0, 0);
        doc.setFont("helvetica", "bold");
        doc.text(d.label.toUpperCase(), textX, textY);
        
        textY += 6;
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        
        doc.setTextColor(100, 100, 100);
        doc.text(`Status: `, textX, textY);
        doc.setTextColor(d.personStatus === 'suspect' ? 200 : 0, 0, 0);
        doc.text(d.personStatus?.toUpperCase() || 'UNKNOWN', textX + 15, textY);
        
        textY += 5;
        doc.setTextColor(100, 100, 100);
        doc.text(`Aliases: ${d.aliases || 'N/A'}`, textX, textY);
        
        textY += 5;
        doc.text(`Role: ${d.role || 'N/A'}`, textX, textY);

        if (d.evidenceSource) {
           textY += 5;
           doc.setFontSize(8);
           doc.text(`Source: ${d.evidenceSource}`, textX, textY);
        }

        yPos += 50;
      });
    }

    // --- EVIDENCE & EXHIBITS ---
    const evidence = nodes.filter(n => n.type === NodeType.EVENT && (n.data as NodeData).type === 'evidence');
    if (evidence.length > 0) {
        checkPageBreak(60);
        doc.setFontSize(14);
        doc.setTextColor(0, 0, 0);
        doc.setFont("helvetica", "bold");
        doc.text("EVIDENCE LOG", margin, yPos);
        yPos += 10;

        evidence.forEach(ev => {
            const d = ev.data as NodeData;
            checkPageBreak(30);
            
            doc.setFontSize(11);
            doc.setTextColor(0, 0, 0);
            doc.text(`• ${d.label}`, margin, yPos);
            
            doc.setFontSize(9);
            doc.setTextColor(80, 80, 80);
            doc.text(`  Type: ${d.evidenceType || 'Unspecified'} | Reliability: ${d.reliability || 0}/5`, margin, yPos + 5);
            
            // Check for attachments (images mostly)
            if (d.image) {
                // If evidence has an inline image property (custom)
                checkPageBreak(40);
                try {
                    doc.addImage(d.image, 'JPEG', margin + 5, yPos + 8, 30, 30);
                    yPos += 40;
                } catch(e) {}
            } else {
                yPos += 10;
            }
        });
    }

    // --- GEOSPATIAL LOG ---
    const locations = nodes.filter(n => n.type === NodeType.EVENT && (n.data as NodeData).coordinates && ((n.data as NodeData).coordinates!.lat !== 0));
    if (locations.length > 0) {
        checkPageBreak(60);
        doc.setFontSize(14);
        doc.setTextColor(0, 0, 0);
        doc.setFont("helvetica", "bold");
        doc.text("GEOSPATIAL DATA", margin, yPos);
        yPos += 10;

        // Table Header
        doc.setFillColor(230, 230, 230);
        doc.rect(margin, yPos, contentWidth, 8, 'F');
        doc.setFontSize(9);
        doc.text("LOCATION NAME", margin + 2, yPos + 5);
        doc.text("COORDINATES", margin + 80, yPos + 5);
        doc.text("LINK", margin + 130, yPos + 5);
        yPos += 10;

        locations.forEach(loc => {
            const d = loc.data as NodeData;
            checkPageBreak(10);
            
            doc.setFontSize(9);
            doc.setTextColor(0, 0, 0);
            doc.text(d.label.substring(0, 40), margin + 2, yPos);
            
            const coords = `${d.coordinates?.lat.toFixed(5)}, ${d.coordinates?.lng.toFixed(5)}`;
            doc.text(coords, margin + 80, yPos);
            
            doc.setTextColor(0, 0, 200);
            doc.textWithLink("Open Map", margin + 130, yPos, { url: `https://www.google.com/maps/search/?api=1&query=${d.coordinates?.lat},${d.coordinates?.lng}` });
            
            yPos += 6;
            doc.setDrawColor(240, 240, 240);
            doc.line(margin, yPos - 2, pageWidth - margin, yPos - 2);
        });
        yPos += 10;
    }

    // --- LEGAL DISCLAIMER ---
    checkPageBreak(30);
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    const disclaimer = "LEGAL DISCLAIMER: This document is an automatically generated intelligence summary based on input data. It serves as an investigative aid and does not constitute a verified forensic report unless signed by a certified officer. Chain of Custody: Electronic generation. Data integrity maintained within IntelBoard Session.";
    const discLines = doc.splitTextToSize(disclaimer, contentWidth);
    doc.text(discLines, margin, pageHeight - 30);

    // Apply Footers to all pages
    addFooter();

    doc.save(`intelboard-case-${caseId}.pdf`);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const result = JSON.parse(event.target?.result as string);
        if (result.nodes && result.edges) {
          takeSnapshot();
          setNodes(result.nodes);
          setEdges(result.edges);
          if (result.investigationType) setManualMode(result.investigationType);
          
          // Clear old analysis to avoid data mismatch, user can hit "Report" to regen
          setAnalysis(null);
          setShowAnalysisPanel(false);
          
          setSimulationToast({ message: 'Case File Loaded Successfully', type: 'success' });
          setTimeout(() => setSimulationToast(null), 3000);
        } else {
          alert('Invalid case file format');
        }
      } catch (err) {
        console.error(err);
        alert('Failed to parse case file');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleResetBoardClick = () => {
    setShowResetConfirm(true);
  };

  const executeResetBoard = () => {
      takeSnapshot();
      setNodes([]);
      setEdges([]);
      setAnalysis(null);
      setShowAnalysisPanel(false);
      setKidnapAnalysis(null);
      setManualMode('AUTO');
      setShowResetConfirm(false);
      setSimulationToast({ message: 'Board Cleared', type: 'info' });
      setTimeout(() => setSimulationToast(null), 2000);
  };

  const takeSnapshot = useCallback(() => {
    setPast((prev) => {
      const newPast = [...prev, { nodes, edges }];
      return newPast.length > 20 ? newPast.slice(1) : newPast;
    });
    setFuture([]);
  }, [nodes, edges]);

  const undo = useCallback(() => {
    if (past.length === 0) return;
    const previous = past[past.length - 1];
    const newPast = past.slice(0, past.length - 1);
    setFuture((prev) => [{ nodes, edges }, ...prev]);
    setNodes(previous.nodes);
    setEdges(previous.edges);
    setPast(newPast);
    setSelectedNode(null);
    setSelectedEdge(null);
  }, [past, nodes, edges, setNodes, setEdges]);

  const redo = useCallback(() => {
    if (future.length === 0) return;
    const next = future[0];
    const newFuture = future.slice(1);
    setPast((prev) => [...prev, { nodes, edges }]);
    setNodes(next.nodes);
    setEdges(next.edges);
    setFuture(newFuture);
    setSelectedNode(null);
    setSelectedEdge(null);
  }, [future, nodes, edges, setNodes, setEdges]);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return;

      if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        e.preventDefault();
        e.shiftKey ? redo() : undo();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'y') {
        e.preventDefault();
        redo();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        handleExportCase();
      }
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'D') {
        e.preventDefault();
        setShowDirectorMode(prev => !prev);
        setSimulationToast({ message: 'Director Mode Toggled', type: 'info' });
        setTimeout(() => setSimulationToast(null), 2000);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, nodes, edges]);

  // --- ANALYSIS EFFECTS ---
  useEffect(() => {
    if (nodes.length > 0) {
      // USE NEW ENGINE
      const localResults = generateLocalSummary(nodes, edges);
      setAnalysis(localResults);
      // NOTE: We do NOT auto-show the bottom panel on every change, only on manual "Logic Engine" click
      // but we update the data so the top-right widget is responsive.

      const hasKidnapKeywords = nodes.some(n => {
        const data = n.data as NodeData;
        return data.role === 'victim' || 
        data.type === 'kidnapping' ||
        data.description?.toLowerCase().includes('abduct') ||
        data.label?.toLowerCase().includes('kidnap') ||
        data.label?.toLowerCase().includes('ransom');
      });

      let activeType = InvestigationType.GENERAL;
      if (manualMode !== 'AUTO') {
        activeType = manualMode;
      } else if (hasKidnapKeywords) {
        activeType = InvestigationType.KIDNAPPING;
      }
      setInvestigationType(activeType);

      if (activeType === InvestigationType.KIDNAPPING) {
        try {
            const kAnalysis = analyzeKidnappingCase(nodes, edges);
            setKidnapAnalysis(kAnalysis);
        } catch (e) {
            console.error("Kidnapping Analysis Crash Prevention:", e);
            setKidnapAnalysis(null);
        }
      } else {
        setKidnapAnalysis(null);
      }
    } else {
        if (manualMode === InvestigationType.KIDNAPPING) {
            setInvestigationType(InvestigationType.KIDNAPPING);
            try {
                const kAnalysis = analyzeKidnappingCase(nodes, edges);
                setKidnapAnalysis(kAnalysis);
            } catch (e) {
                console.error("Kidnapping Analysis Crash Prevention (Empty):", e);
                setKidnapAnalysis(null);
            }
        } else {
            setInvestigationType(InvestigationType.GENERAL);
            setKidnapAnalysis(null);
        }
    }
  }, [nodes, edges, manualMode]);

  // --- HANDLERS ---
  const handleActionSimulation = (action: string) => {
    let message = '';
    let type: 'info' | 'success' = 'info';
    switch (action) {
      case 'activate_irt': message = 'Dispatching Intelligence Response Team (IRT)...'; break;
      case 'track_phones': message = 'Triangulating GSM Signals...'; break;
      case 'setup_roadblocks': message = 'Alerting State Commands & Highway Patrol...'; break;
      case 'contact_family': message = 'Initiating Secure Line with Family Liaison...'; break;
      default: message = 'Processing Action...';
    }
    setSimulationToast({ message, type: 'info' });
    setTimeout(() => {
      let successMsg = '';
      switch (action) {
        case 'activate_irt': successMsg = 'IRT Units Deployed & Active'; break;
        case 'track_phones': successMsg = 'Signal Locked: Cell ID #4922 (Approximation)'; break;
        case 'setup_roadblocks': successMsg = 'Gridlock Protocol Active in 3 Zones'; break;
        case 'contact_family': successMsg = 'Secure Channel Established'; break;
        default: successMsg = 'Action Completed';
      }
      setSimulationToast({ message: successMsg, type: 'success' });
      setTimeout(() => setSimulationToast(null), 3000);
    }, 1500);
  };

  const onConnect = useCallback(
    (params: Connection) => {
      takeSnapshot();
      setEdges((eds) => addEdge({ 
        ...params, 
        type: 'deletable', 
        animated: true, 
        style: { stroke: '#64748b', strokeWidth: 2 } 
      } as Edge, eds));
    },
    [setEdges, takeSnapshot],
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      takeSnapshot();
      const typeStr = event.dataTransfer.getData('application/reactflow');
      const isKidnapTool = event.dataTransfer.getData('kidnap') === 'true';
      
      let nodeType: NodeType | undefined = undefined;
      if (Object.values(NodeType).includes(typeStr as NodeType)) {
        nodeType = typeStr as NodeType;
      }

      if (!nodeType && !isKidnapTool) {
          if (['location', 'evidence'].includes(typeStr)) {
             nodeType = NodeType.EVENT;
          } else if (typeStr === 'organization') {
             nodeType = NodeType.PERSON;
          } else {
             nodeType = NodeType.EVENT;
          }
      }
      
      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      let initialData: any = { label: 'New Node' };

      if (isKidnapTool) {
         const toolType = typeStr; 
         if (toolType === 'victim') {
             nodeType = NodeType.PERSON;
             initialData = { label: 'Victim', role: 'victim', medicalCondition: '', abductionTime: new Date().toISOString() };
         } else if (toolType === 'ransom') {
             nodeType = NodeType.EVENT;
             initialData = { label: 'Ransom Demand', type: 'communication', amount: 5000000 };
         } else {
             nodeType = NodeType.EVENT;
             initialData = { label: toolType.charAt(0).toUpperCase() + toolType.slice(1), role: toolType };
         }
      } else {
          if (typeStr === 'location') {
              initialData = { label: 'New Location', location: 'Unknown Location', type: 'location' };
          } else if (typeStr === 'evidence') {
              initialData = { label: 'New Evidence', evidenceSource: 'TBD', type: 'evidence', evidenceType: 'physical' };
          } else if (typeStr === 'organization') {
              initialData = { label: 'New Organization', type: 'organization' };
          } else if (nodeType === NodeType.NOTE) {
              initialData = { label: 'New Note', noteColor: '#fef3c7' };
          } else {
             initialData = { 
               label: `New ${nodeType === NodeType.EVENT ? 'Event' : 'Person'}`, 
               type: nodeType === NodeType.EVENT ? 'event' : undefined,
               date: '', 
               evidenceSource: '' 
             };
             if(nodeType === NodeType.PERSON) initialData.personStatus = 'unknown';
          }
      }

      const newNode: Node = {
        id: getId(),
        type: nodeType,
        position,
        data: initialData,
      };

      setNodes((nds) => nds.concat(newNode));
      setSelectedNode(newNode);
      setSelectedEdge(null);
    },
    [screenToFlowPosition, setNodes, takeSnapshot],
  );

  const onNodeDragStart = useCallback(() => {
    takeSnapshot();
  }, [takeSnapshot]);

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
    setSelectedEdge(null);
  }, []);

  const onEdgeClick = useCallback((_: React.MouseEvent, edge: Edge) => {
    setSelectedEdge(edge);
    setSelectedNode(null);
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
    setSelectedEdge(null);
  }, []);

  const handleDeleteNode = useCallback((id: string) => {
    takeSnapshot();
    setNodes((nds) => nds.filter((n) => n.id !== id));
    setEdges((eds) => eds.filter((e) => e.source !== id && e.target !== id));
    setSelectedNode(null);
  }, [setNodes, setEdges, takeSnapshot]);

  const handleDeleteEdge = useCallback((id: string) => {
    takeSnapshot();
    setEdges((eds) => eds.filter((e) => e.id !== id));
    setSelectedEdge(null);
  }, [setEdges, takeSnapshot]);

  const handleOfflineAnalysis = () => {
    if (nodes.length === 0) return;
    setIsAnalyzing(true);
    // Don't clear analysis immediately to avoid flicker, just update
    setShowAnalysisOptions(false); 

    setTimeout(() => {
      const localSummary = generateLocalSummary(nodes, edges);
      setAnalysis(localSummary);
      setShowAnalysisPanel(true); // Explicitly show bottom panel
      setIsAnalyzing(false);
      setSimulationToast({ message: 'Offline Analysis Complete', type: 'success' });
      setTimeout(() => setSimulationToast(null), 3000);
    }, 800);
  };

  const handleAnalyzeClick = () => {
    if (nodes.length > 0) {
      handleOfflineAnalysis();
    }
  };

  // NEW: Dedicated Report Button Handler
  const handleOpenReport = () => {
    // Robust: Always regenerate to ensure fresh data for the modal/PDF
    const current = generateLocalSummary(nodes, edges);
    setAnalysis(current);
    setShowFullAnalysis(true);
  };

  const handleDirectorAnalysis = async () => {
      handleOfflineAnalysis();
  };
  
  // NEW: Handle Text to Board
  const handleGenerateBoard = async () => {
    if (!reportText.trim()) return;
    setIsGeneratingBoard(true);
    try {
       const result = await parseNarrativeToBoard(reportText);
       
       if (result && result.nodes) {
         takeSnapshot();
         
         const newNodes: Node[] = [];
         const newEdges: Edge[] = [];
         const nodeMap = new Map<string, string>(); // Label -> ID
         
         // Helper to generate a unique ID
         const genId = () => `ai_node_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;

         // Helper for loose matching
         const norm = (s: string) => s?.trim().toLowerCase() || '';
         
         // 1. Create Nodes (Grid Layout)
         result.nodes.forEach((n: any, idx: number) => {
             const newId = genId();
             nodeMap.set(norm(n.label), newId);
             
             // Simple grid layout logic
             const cols = 4;
             const spacingX = 250;
             const spacingY = 150;
             const x = 100 + (idx % cols) * spacingX;
             const y = 100 + Math.floor(idx / cols) * spacingY;
             
             newNodes.push({
               id: newId,
               type: n.type,
               position: { x, y },
               data: {
                 label: n.label,
                 description: n.description || '',
                 date: n.date || '',
                 role: n.role || '',
                 personStatus: n.personStatus || 'unknown',
                 location: n.location || '',
                 evidenceSource: 'Logic Engine Extraction', 
                 type: n.subtype || 'event',
                 amount: n.amount,
                 evidenceType: n.evidenceType
               }
             });
         });
         
         // 2. Create Edges
         if (result.edges) {
           result.edges.forEach((e: any, idx: number) => {
              const srcId = nodeMap.get(norm(e.source_label));
              const tgtId = nodeMap.get(norm(e.target_label));
              
              if (srcId && tgtId) {
                newEdges.push({
                   id: `ai_edge_${idx}`,
                   source: srcId,
                   target: tgtId,
                   label: e.relation || 'related',
                   type: 'deletable',
                   animated: true,
                   style: { stroke: '#64748b', strokeWidth: 2 } 
                });
              }
           });
         }
         
         if(newNodes.length > 0) {
            setNodes(newNodes);
            setEdges(newEdges);
            setShowReportInput(false);
            setReportText("");
            setSimulationToast({ message: 'Board Generated from Report', type: 'success' });
            setTimeout(() => setSimulationToast(null), 3000);
         }
       }
    } catch (e) {
      console.error(e);
      alert("Failed to process report.");
    } finally {
      setIsGeneratingBoard(false);
    }
  };

  const kidnappingSidebarItems = [
    { type: 'victim', label: '👤 Victim' },
    { type: 'ransom', label: '💰 Ransom' },
    { type: 'hideout', label: '🏚️ Hideout' },
    { type: 'vehicle', label: '🚗 Vehicle' },
    { type: 'accomplice', label: '👥 Accomplice' },
    { type: 'communication', label: '📞 Comms' },
  ];

  const isOfflineReport = analysis?.summary.includes('This investigation board tracks') || false;

  return (
    <div className="flex h-screen w-full bg-slate-950 text-slate-200 font-sans selection:bg-amber-500/30">
      <Sidebar onLogout={onLogout} />
      
      {/* DIRECTOR MODE OVERLAY - CONDITIONAL RENDER */}
      {showDirectorMode && (
        <DirectorMode 
          setNodes={setNodes}
          setEdges={setEdges}
          setManualMode={setManualMode}
          handleAnalysis={handleDirectorAnalysis}
          setSelectedNode={setSelectedNode}
          setSimulationToast={setSimulationToast}
          onCloseEditor={() => {
            setSelectedNode(null);
            setSelectedEdge(null);
          }}
        />
      )}

      {/* SAVE/LOAD MANAGER MODAL */}
      {showSaveLoadModal && (
        <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md z-[100] flex items-center justify-center p-4">
           <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-2xl animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[85vh]">
              <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-800/50">
                 <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                    <FolderOpen className="w-6 h-6 text-amber-500" />
                    Case Manager (Browser Storage)
                 </h2>
                 <button onClick={() => setShowSaveLoadModal(false)} className="text-slate-400 hover:text-white">
                    <X className="w-5 h-5" />
                 </button>
              </div>
              <div className="p-6 flex-1 flex flex-col overflow-hidden">
                 
                 {/* Save Current Section */}
                 <div className="mb-8 p-4 bg-slate-800/30 rounded-lg border border-slate-700/50">
                    <h3 className="text-sm font-bold text-slate-300 mb-3 flex items-center gap-2 uppercase tracking-wide">
                      <Save className="w-4 h-4" /> Save Current Project
                    </h3>
                    <div className="flex gap-2">
                       <input 
                         type="text" 
                         value={saveName}
                         onChange={(e) => setSaveName(e.target.value)}
                         placeholder="Enter case name (e.g. Operation Alpha)..."
                         className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-slate-200 focus:outline-none focus:border-amber-500 transition-colors"
                         onKeyDown={(e) => e.key === 'Enter' && handleSaveToBrowser()}
                       />
                       <button 
                         onClick={handleSaveToBrowser}
                         disabled={!saveName.trim()}
                         className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
                       >
                         Save Snapshot
                       </button>
                    </div>
                 </div>

                 {/* Saved Cases List */}
                 <div className="flex-1 overflow-hidden flex flex-col">
                    <h3 className="text-sm font-bold text-slate-300 mb-3 flex items-center gap-2 uppercase tracking-wide">
                      <Clock className="w-4 h-4" /> Saved Projects
                    </h3>
                    
                    <div className="flex-1 overflow-y-auto pr-2 space-y-2 custom-scrollbar">
                       {savedCases.length === 0 ? (
                         <div className="text-center py-12 text-slate-500 border-2 border-dashed border-slate-800 rounded-lg">
                            <FolderOpen className="w-12 h-12 mx-auto mb-2 opacity-20" />
                            <p>No saved cases found on this device.</p>
                         </div>
                       ) : (
                         savedCases.map((savedCase) => (
                           <div key={savedCase.id} className="p-4 bg-slate-800 rounded-lg border border-slate-700 hover:border-slate-500 transition-colors flex items-center justify-between group">
                              <div>
                                 <div className="font-bold text-slate-200 text-lg">{savedCase.name}</div>
                                 <div className="text-xs text-slate-500 flex items-center gap-3 mt-1">
                                    <span>{new Date(savedCase.date).toLocaleString()}</span>
                                    <span>•</span>
                                    <span>{savedCase.nodeCount} Entities</span>
                                 </div>
                              </div>
                              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                 <button 
                                   onClick={() => handleLoadFromBrowser(savedCase)}
                                   className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded transition-colors"
                                 >
                                   Load
                                 </button>
                                 <button 
                                   onClick={() => handleDeleteSavedCase(savedCase.id)}
                                   className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-900/20 rounded transition-colors"
                                   title="Delete"
                                 >
                                   <Trash2 className="w-4 h-4" />
                                 </button>
                              </div>
                           </div>
                         ))
                       )}
                    </div>
                 </div>

              </div>
           </div>
        </div>
      )}

      {/* REPORT INPUT MODAL */}
      {showReportInput && (
        <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md z-[100] flex items-center justify-center p-4">
           <div className="bg-slate-900 border border-purple-500/50 rounded-xl shadow-2xl w-full max-w-2xl animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
              <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-purple-900/10">
                 <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                    <Wand2 className="w-6 h-6 text-purple-400" />
                    Visualize Report Narrative
                 </h2>
                 <button onClick={() => setShowReportInput(false)} className="text-slate-400 hover:text-white">
                    <X className="w-5 h-5" />
                 </button>
              </div>
              <div className="p-6 flex-1 flex flex-col">
                 <p className="text-slate-400 text-sm mb-4">
                   Paste a witness statement, police report, or case summary below. The Logic Engine will extract entities and build the board for you.
                 </p>
                 <textarea
                   className="w-full h-64 bg-slate-950 border border-slate-700 rounded-lg p-4 text-slate-200 focus:outline-none focus:border-purple-500 font-mono text-sm resize-none mb-4"
                   placeholder="e.g. On the night of August 12th, Mr. John Doe was seen leaving the Lagos Continental Hotel with a red briefcase. He met with an unknown individual in a black Toyota Corolla (Plate: ABJ-123-XY)..."
                   value={reportText}
                   onChange={(e) => setReportText(e.target.value)}
                 />
                 <div className="flex justify-end gap-3">
                    <button 
                      onClick={() => setShowReportInput(false)}
                      className="px-4 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={handleGenerateBoard}
                      disabled={isGeneratingBoard || !reportText.trim()}
                      className={`
                        px-6 py-2 rounded-lg font-bold flex items-center gap-2 transition-all
                        ${isGeneratingBoard 
                          ? 'bg-slate-700 text-slate-400 cursor-wait' 
                          : 'bg-purple-600 hover:bg-purple-500 text-white shadow-[0_0_15px_rgba(147,51,234,0.3)]'}
                      `}
                    >
                       {isGeneratingBoard ? (
                         <><Loader2 className="w-4 h-4 animate-spin" /> Processing...</>
                       ) : (
                         <><BrainCircuit className="w-4 h-4" /> Generate Board</>
                       )}
                    </button>
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* RESET CONFIRMATION MODAL */}
      {showResetConfirm && (
        <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 shadow-2xl max-w-sm w-full animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 mb-4 text-red-500">
              <div className="p-2 bg-red-900/30 rounded-full">
                <AlertCircle className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-100">Clear Investigation?</h3>
            </div>
            
            <p className="text-slate-400 text-sm mb-6 leading-relaxed">
              This will remove all nodes and edges from the board. This action can be undone using <span className="text-slate-200 font-mono text-xs bg-slate-800 px-1 py-0.5 rounded">Ctrl+Z</span>.
            </p>
            
            <div className="flex gap-3 justify-end">
              <button 
                onClick={() => setShowResetConfirm(false)}
                className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors text-sm font-medium"
              >
                Cancel
              </button>
              <button 
                onClick={executeResetBoard}
                className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-500 transition-colors text-sm font-medium"
              >
                Clear Board
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 h-full relative" ref={reactFlowWrapper}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onDrop={onDrop}
          onDragOver={onDragOver}
          onNodeDragStart={onNodeDragStart}
          onNodeClick={onNodeClick}
          onEdgeClick={onEdgeClick}
          onPaneClick={onPaneClick}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          deleteKeyCode={['Backspace', 'Delete']}
          fitView
          minZoom={0.1}
          maxZoom={8}
          className="bg-slate-950"
        >
          <Controls className="!bg-slate-800 !border-slate-700 !fill-slate-400 [&>button]:!border-slate-700 hover:[&>button]:!bg-slate-700" />
          <Background color="#1e293b" gap={20} variant={BackgroundVariant.Dots} />
          
          <Panel position="top-right" className="flex flex-col gap-4 mt-20 md:mt-0 items-end">
            <div className="flex gap-2">
               {/* Mode Selector */}
               <div className="flex items-center bg-slate-800 rounded-lg p-1 border border-slate-700 shadow-lg px-2 gap-2">
                 <Briefcase className={`w-4 h-4 ${investigationType === InvestigationType.KIDNAPPING ? 'text-red-500' : 'text-slate-400'}`} />
                 <select 
                    id="mode-selector"
                    value={manualMode}
                    onChange={(e) => setManualMode(e.target.value as any)}
                    className="bg-transparent text-sm font-medium text-slate-200 focus:outline-none cursor-pointer"
                 >
                   <option value="AUTO">Auto Detect</option>
                   <option value={InvestigationType.GENERAL}>General Case</option>
                   <option value={InvestigationType.KIDNAPPING}>Kidnapping</option>
                 </select>
               </div>
               
               {/* File Operations */}
               <div className="flex bg-slate-800 rounded-lg p-1 border border-slate-700 shadow-lg">
                <input 
                  type="file" 
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".json"
                  className="hidden" 
                />
                
                {/* NEW: Case Manager Button */}
                <button
                  id="btn-casemanager"
                  onClick={() => setShowSaveLoadModal(true)}
                  className="p-2 rounded hover:bg-slate-700 text-amber-500 hover:text-amber-400 transition-colors"
                  title="Case Manager (Save/Load)"
                >
                  <FolderOpen className="w-4 h-4" />
                </button>
                <div className="w-px bg-slate-700 my-1 mx-1" />

                <button
                  id="btn-import"
                  onClick={handleImportClick}
                  className="p-2 rounded hover:bg-slate-700 transition-colors text-slate-200"
                  title="Import .JSON File"
                >
                  <Upload className="w-4 h-4" />
                </button>
                <div className="w-px bg-slate-700 my-1 mx-1" />
                <button
                  id="btn-export"
                  onClick={handleExportCase}
                  className="p-2 rounded hover:bg-slate-700 transition-colors text-slate-200"
                  title="Download .JSON File"
                >
                  <Download className="w-4 h-4" />
                </button>
                <div className="w-px bg-slate-700 my-1 mx-1" />
                <button
                  id="btn-clear"
                  onClick={handleResetBoardClick}
                  className="p-2 rounded hover:bg-red-900/50 text-slate-200 hover:text-red-400 transition-colors"
                  title="Clear Board"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {/* Report Visualizer Button (NEW) */}
              <button
                onClick={() => setShowReportInput(true)}
                className="p-2 bg-purple-900/50 hover:bg-purple-800 border border-purple-500/30 rounded-lg text-purple-200 transition-colors shadow-lg group relative"
                title="Visualize Report Text"
              >
                <FileText className="w-4 h-4" />
                {/* Tooltip */}
                <span className="absolute right-0 top-full mt-2 w-max px-2 py-1 bg-purple-900 text-purple-100 text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none border border-purple-500/50">
                  Visualize Text
                </span>
              </button>

              {/* Undo/Redo */}
              <div className="flex bg-slate-800 rounded-lg p-1 border border-slate-700 shadow-lg">
                <button
                  id="btn-undo"
                  onClick={undo}
                  disabled={past.length === 0}
                  className={`p-2 rounded hover:bg-slate-700 transition-colors ${past.length === 0 ? 'opacity-30 cursor-not-allowed' : 'text-slate-200'}`}
                  title="Undo (Ctrl+Z)"
                >
                  <Undo2 className="w-4 h-4" />
                </button>
                <div className="w-px bg-slate-700 my-1 mx-1" />
                <button
                  id="btn-redo"
                  onClick={redo}
                  disabled={future.length === 0}
                  className={`p-2 rounded hover:bg-slate-700 transition-colors ${future.length === 0 ? 'opacity-30 cursor-not-allowed' : 'text-slate-200'}`}
                  title="Redo (Ctrl+Y)"
                >
                  <Redo2 className="w-4 h-4" />
                </button>
              </div>

              {/* Offline Analysis Button */}
              <button 
                id="btn-analyze"
                onClick={handleAnalyzeClick}
                disabled={isAnalyzing || nodes.length === 0}
                className={`
                  flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm shadow-lg transition-all
                  ${isAnalyzing 
                    ? 'bg-slate-800 text-slate-400 cursor-wait' 
                    : 'bg-blue-600 hover:bg-blue-500 text-white hover:scale-105 active:scale-95'}
                `}
              >
                {isAnalyzing ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Analyzing...</>
                ) : (
                  <><Cpu className="w-4 h-4" /> Logic Engine</>
                )}
              </button>

              {/* NEW: Robust Report Button */}
              <button
                onClick={handleOpenReport}
                disabled={nodes.length === 0}
                className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm shadow-lg transition-all bg-emerald-600 hover:bg-emerald-500 text-white hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100"
                title="Generate Full Report (PDF)"
              >
                <ClipboardList className="w-4 h-4" />
                Report
              </button>
            </div>
          </Panel>

           {/* SIMULATION TOAST */}
          {simulationToast && (
             <div className="absolute top-20 left-1/2 -translate-x-1/2 z-50 animate-slide-in-bottom">
                <div className={`
                  flex items-center gap-3 px-4 py-3 rounded-lg shadow-2xl border backdrop-blur-md
                  ${simulationToast.type === 'success' 
                    ? 'bg-emerald-900/80 border-emerald-500/50 text-emerald-100' 
                    : 'bg-blue-900/80 border-blue-500/50 text-blue-100'}
                `}>
                  {simulationToast.type === 'success' ? (
                     <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  ) : (
                     <Radio className="w-5 h-5 text-blue-400 animate-pulse" />
                  )}
                  <div className="font-medium text-sm">{simulationToast.message}</div>
                </div>
             </div>
          )}

        </ReactFlow>

        {/* Local Analysis Widget */}
        {analysis && (analysis.redFlags.length > 0) && (
          <div className="absolute top-20 right-4 w-80 bg-slate-900/95 border border-slate-700 rounded-lg p-4 shadow-xl z-40 animate-slide-in-right">
            <div className="flex items-center gap-2 mb-3">
              <ShieldAlert className="w-5 h-5 text-amber-500" />
              <h3 className="font-bold text-slate-200">Local Intelligence</h3>
              <span className="ml-auto text-xs bg-slate-800 px-2 py-1 rounded">
                {analysis.redFlags.filter(f => f.severity === 'HIGH').length} 🔴
              </span>
            </div>

            {analysis.redFlags.slice(0, 3).map((flag, idx) => (
              <div key={idx} className={`mb-2 p-2 rounded border text-sm ${
                flag.severity === 'HIGH' 
                  ? 'bg-red-900/20 border-red-500/40' 
                  : 'bg-amber-900/20 border-amber-500/40'
              }`}>
                <div className="flex items-start gap-2">
                  <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                    flag.severity === 'HIGH' ? 'bg-red-500' : 'bg-amber-500'
                  }`} />
                  <div>
                    <div className="text-slate-300 leading-tight">{flag.message}</div>
                  </div>
                </div>
              </div>
            ))}

            <button 
              className="w-full text-xs text-center text-slate-400 hover:text-slate-200 py-1 bg-slate-800/50 rounded mt-1"
              onClick={() => setShowFullAnalysis(true)}
            >
              View Full Report {analysis.redFlags.length > 3 ? `(+${analysis.redFlags.length - 3} more)` : ''}
            </button>
          </div>
        )}

        {/* Kidnapping Dashboard Overlay - Only visible in Kidnapping Mode */}
        {investigationType === InvestigationType.KIDNAPPING && kidnapAnalysis && (
          <KidnappingDashboard 
            analysis={kidnapAnalysis}
            onAction={handleActionSimulation}
          />
        )}

        {/* Kidnapping Tools Palette - Only visible in Kidnapping Mode */}
        {investigationType === InvestigationType.KIDNAPPING && (
          <div id="kidnap-tools" className="absolute bottom-4 left-4 w-48 bg-red-900/80 backdrop-blur border border-red-500/50 rounded-lg p-3 z-40 animate-slide-in-bottom shadow-lg">
            <div className="text-xs text-red-200 font-bold mb-2 uppercase tracking-wider flex items-center gap-2">
               <AlertTriangle className="w-3 h-3" /> Kidnap Tools
            </div>
            <div className="grid grid-cols-2 gap-2">
              {kidnappingSidebarItems.map((item, idx) => (
                <div
                  id={item.type === 'ransom' ? 'tool-ransom' : `tool-${item.type}`}
                  key={idx}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData('application/reactflow', item.type);
                    e.dataTransfer.setData('kidnap', 'true');
                  }}
                  className="p-2 bg-slate-900/60 hover:bg-red-700/60 rounded text-center cursor-grab text-xs border border-red-500/30 text-slate-200 transition-colors"
                >
                  {item.label}
                </div>
              ))}
            </div>
          </div>
        )}

        <EditorPanel 
          selectedNode={selectedNode}
          selectedEdge={selectedEdge}
          setNodes={(newNodesOrUpdater) => {
             setNodes(newNodesOrUpdater);
          }}
          setEdges={(newEdgesOrUpdater) => {
            setEdges(newEdgesOrUpdater);
          }}
          onClose={() => {
            setSelectedNode(null);
            setSelectedEdge(null);
          }}
          deleteNode={handleDeleteNode}
          deleteEdge={handleDeleteEdge}
        />

        {/* Full Local Analysis Modal */}
        {showFullAnalysis && analysis && (
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-4xl max-h-[85vh] overflow-y-auto p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-slate-200 flex items-center gap-2">
                  <ShieldAlert className="w-6 h-6 text-amber-500" />
                  Complete Analysis Report
                </h2>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={handleDownloadPDF}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors"
                  >
                    <FileDown className="w-4 h-4" />
                    Download PDF
                  </button>
                  <button 
                    onClick={() => setShowFullAnalysis(false)}
                    className="text-slate-500 hover:text-white transition-colors p-2 hover:bg-slate-800 rounded-full"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <section className="mb-8">
                <h3 className="text-lg font-semibold text-slate-200 mb-3 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-500" />
                  Investigation Alerts ({analysis.redFlags.length})
                </h3>
                <div className="space-y-3">
                  {analysis.redFlags.map((flag, idx) => {
                    return (
                    <div key={idx} className={`p-4 rounded-lg border ${
                      flag.severity === 'HIGH' 
                        ? 'border-red-500/30 bg-red-900/10' 
                        : 'border-amber-500/30 bg-amber-900/10'
                    }`}>
                      <div className="flex items-center gap-3 mb-2">
                        <div className={`w-3 h-3 rounded-full ${
                          flag.severity === 'HIGH' ? 'bg-red-500' : 'bg-amber-500'
                        }`} />
                        <span className="font-medium text-slate-200">{flag.type.replace(/_/g, ' ')}</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider ${
                          flag.severity === 'HIGH' 
                            ? 'bg-red-500/20 text-red-300' 
                            : 'bg-amber-500/20 text-amber-300'
                        }`}>
                          {flag.severity}
                        </span>
                      </div>
                      <p className="text-slate-300 mb-2">{flag.message}</p>
                    </div>
                  )})}
                </div>
              </section>

              {analysis.gaps && analysis.gaps.length > 0 && (
                 <section className="mb-8">
                   <h3 className="text-lg font-semibold text-slate-200 mb-3 flex items-center gap-2">
                     <BrainCircuit className="w-5 h-5 text-purple-400" />
                     Investigative Gaps
                   </h3>
                   <div className="bg-slate-800/30 rounded border border-slate-700 p-4">
                      <ul className="list-disc pl-5 space-y-2 text-slate-300">
                        {analysis.gaps.map((gap, i) => (
                           <li key={i}>{gap}</li>
                        ))}
                      </ul>
                   </div>
                 </section>
              )}

              {analysis.clusters && analysis.clusters.length > 0 && (
                <section className="mb-8">
                  <h3 className="text-lg font-semibold text-slate-200 mb-3 flex items-center gap-2">
                    <Link2 className="w-5 h-5 text-blue-500" />
                    Network Groups
                  </h3>
                  <div className="space-y-3">
                    {analysis.clusters.map((cluster, idx) => (
                      <div key={idx} className="p-3 bg-slate-800/30 rounded border border-slate-700">
                        <div className="flex justify-between items-center">
                          <div>
                            <div className="text-slate-200 font-medium">Group {cluster.id}</div>
                            <div className="text-sm text-slate-400">{cluster.members.join(', ')}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </div>
          </div>
        )}

        {/* BOTTOM PANEL: VISIBILITY NOW CONTROLLED BY showAnalysisPanel */}
        {analysis && showAnalysisPanel && !isAnalyzing && (
          <div className={`absolute bottom-6 left-6 right-6 md:left-20 md:right-auto md:w-[500px] bg-slate-900/95 backdrop-blur border ${isOfflineReport ? 'border-blue-500/50' : 'border-amber-500/30'} rounded-xl shadow-2xl p-6 animate-slide-in-bottom z-50 max-h-[40vh] overflow-y-auto`}>
            <div className="flex justify-between items-start mb-4">
              <h3 className={`text-lg font-bold ${isOfflineReport ? 'text-blue-400' : 'text-amber-500'} flex items-center gap-2`}>
                {isOfflineReport ? <Cpu className="w-5 h-5" /> : <Sparkles className="w-5 h-5" />}
                {isOfflineReport ? 'Offline Intelligence Report' : 'Gemini Intelligence Summary'}
              </h3>
              {/* CHANGE: Only hide this panel, do not clear analysis state */}
              <button 
                onClick={() => setShowAnalysisPanel(false)}
                className="text-slate-500 hover:text-slate-300"
              >
                <span className="sr-only">Close</span>
                ✕
              </button>
            </div>
            
            <div className="space-y-4 text-sm text-slate-300">
              <div className={`bg-slate-800/50 p-3 rounded border ${isOfflineReport ? 'border-blue-500/20' : 'border-slate-700'}`}>
                <p className="leading-relaxed">{analysis.summary}</p>
              </div>

              {analysis.gaps.length > 0 && (
                <div>
                  <h4 className="font-semibold text-slate-200 mb-2 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-400" /> Investigative Gaps
                  </h4>
                  <ul className="list-disc pl-5 space-y-1 text-slate-400">
                    {analysis.gaps.map((gap, i) => (
                      <li key={i}>{gap}</li>
                    ))}
                  </ul>
                </div>
              )}

              {analysis.connections.length > 0 && (
                <div>
                  <h4 className="font-semibold text-slate-200 mb-2 flex items-center gap-2">
                    <Link2 className="w-4 h-4 text-blue-400" /> Inferred Groups
                  </h4>
                  <ul className="list-disc pl-5 space-y-1 text-slate-400">
                    {analysis.connections.map((conn, i) => (
                      <li key={i}>{conn}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export const App = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  if (!isAuthenticated) {
    return <LoginScreen onLogin={() => setIsAuthenticated(true)} />;
  }

  return (
    <ReactFlowProvider>
      <InvestigationCanvas onLogout={() => setIsAuthenticated(false)} />
    </ReactFlowProvider>
  );
};