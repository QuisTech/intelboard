import React, { useState, useRef, useEffect } from 'react';
import { MousePointer2, Play, Square, Video, Loader2, Maximize2, Minimize2, Settings2, Gauge, Disc, Download } from 'lucide-react';
import { Node, Edge, useReactFlow } from '@xyflow/react';
import { NodeType, InvestigationType } from '../types';

interface DirectorModeProps {
  setNodes: React.Dispatch<React.SetStateAction<Node[]>>;
  setEdges: React.Dispatch<React.SetStateAction<Edge[]>>;
  setManualMode: (mode: any) => void;
  handleAnalysis: () => void;
  setSelectedNode: (node: Node | null) => void;
  setSimulationToast: (toast: any) => void;
  onCloseEditor: () => void;
}

// THE SCRIPT - Updated with longer durations for voiceover
const DEMO_SCRIPT = [
  // --- INTRO ---
  { duration: 6000, text: "Welcome to IntelBoard. The next-generation investigation workspace for modern intelligence units.", action: 'wait' },
  
  // --- SIDEBAR TOUR ---
  { duration: 5000, text: "Let's explore the interface. On the left, the Asset Library holds core entities like Events and Persons...", action: 'move:sidebar-item-person' },
  { duration: 5000, text: "...and specialized intelligence assets like Evidence and Organizations.", action: 'move:sidebar-item-evidence' },
  
  // --- TOOLBAR TOUR ---
  { duration: 5000, text: "Top right controls provide case management. Toggle protocols between General and specialized Kidnapping modes.", action: 'move:mode-selector' },
  { duration: 4000, text: "You can securely Import, Export, or Clear case files.", action: 'move:btn-export' },
  { duration: 4000, text: "And full Undo/Redo history protects your analysis workflow.", action: 'move:btn-undo' },

  // --- CANVAS BUILDING ---
  { duration: 5000, text: "Let's build a case. We start with a Person of Interest.", action: 'drag:sidebar-item-person:canvas' },
  { duration: 5000, text: "And link them to a piece of Digital Evidence.", action: 'drag:sidebar-item-evidence:canvas' },

  // --- DETAILED EDITING: PERSON ---
  { duration: 4000, text: "Precision editing is key. Let's identify the subject.", action: 'click:node-person' },
  { duration: 4000, text: "Identity: Ibrahim Musa.", action: 'edit:node-person:label:Ibrahim Musa' },
  { duration: 4000, text: "We can now tag their Status directly: Suspect.", action: 'edit:node-person:personStatus:suspect' },
  { duration: 4000, text: "And add known aliases for cross-referencing.", action: 'edit:node-person:aliases:The Ghost' },

  // --- DETAILED EDITING: EVIDENCE ---
  { duration: 4000, text: "Now for the evidence. This isn't just a text box.", action: 'click:node-evidence' },
  { duration: 3000, text: "Label: Burner Phone.", action: 'edit:node-evidence:label:Burner Phone' },
  { duration: 3000, text: "Categorize as: Digital Evidence.", action: 'edit:node-evidence:evidenceType:digital' },
  { duration: 4000, text: "And rate its Reliability. 5-Star verified intel.", action: 'edit:node-evidence:reliability:5' },
  { duration: 3000, text: "Closing editor.", action: 'click:close-editor' },

  // --- CONNECTIONS ---
  { duration: 4000, text: "Let's add a sighting location.", action: 'drag:sidebar-item-location:canvas' },
  { duration: 5000, text: "Now we visualize the network. Suspect linked to the Phone...", action: 'connect:node-person:node-evidence' },
  { duration: 4000, text: "...and Suspect linked to the Location.", action: 'connect:node-person:node-location' },

  // --- KIDNAPPING PROTOCOL ---
  { duration: 5000, text: "Now, let's switch protocols to a Kidnapping Investigation.", action: 'click:mode-selector' },
  { duration: 3000, text: "Activating Protocol...", action: 'select:mode:kidnapping' },
  { duration: 6000, text: "The UI adapts. Specialized tools appear at the bottom for Ransom and Victim management.", action: 'move:kidnap-tools' },
  
  // --- SCENARIO EXPANSION ---
  { duration: 4000, text: "Let's log a Ransom Demand.", action: 'drag:tool-ransom:canvas' },
  { duration: 4000, text: "Connecting it to our prime suspect.", action: 'connect:node-person:node-ransom' },

  // --- ANALYSIS ---
  { duration: 5000, text: "The Intelligence Engine scans for patterns, gaps, and risks.", action: 'move:btn-analyze' },
  { duration: 6000, text: "Processing graph data...", action: 'click:btn-analyze' },
  { duration: 7000, text: "The system returns a comprehensive report, detecting the kidnapping context and suggesting immediate actions.", action: 'wait' },

  // --- SIMULATION ---
  { duration: 5000, text: "We can trigger real-time response protocols directly.", action: 'move:dash-activate-irt' },
  { duration: 4000, text: "Dispatching Intelligence Response Team...", action: 'click:dash-activate-irt' },
  
  // --- OUTRO ---
  { duration: 6000, text: "IntelBoard: Secure. Smart. Essential.", action: 'wait' },
  { duration: 3000, text: "End of demonstration.", action: 'finish' },
];

export const DirectorMode: React.FC<DirectorModeProps> = ({ 
  setNodes,
  setEdges,
  setManualMode,
  handleAnalysis,
  setSelectedNode,
  setSimulationToast,
  onCloseEditor
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [currentSubtitle, setCurrentSubtitle] = useState("");
  const [mousePos, setMousePos] = useState({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
  const [isMinimized, setIsMinimized] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0); // 1.0 = Normal, 0.5 = Slow
  
  const isPlayingRef = useRef(false);
  const speedRef = useRef(1.0); 
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const { screenToFlowPosition, getNodes, getEdges } = useReactFlow();

  useEffect(() => {
    speedRef.current = playbackSpeed;
  }, [playbackSpeed]);

  // --- RECORDING ENGINE ---

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { 
          displaySurface: "browser", // Prompt to share tab/window
          frameRate: 30 
        },
        audio: false
      });
      
      // Handle user manually stopping share via browser UI
      stream.getVideoTracks()[0].onended = () => {
        stopDirectorMode();
      };

      const options = MediaRecorder.isTypeSupported('video/webm;codecs=vp9') 
        ? { mimeType: 'video/webm;codecs=vp9' } 
        : undefined;

      const recorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `intelboard-demo-${new Date().toISOString().slice(0,19).replace(/:/g, '-')}.webm`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        setIsRecording(false);
        
        // Ensure tracks are stopped
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start();
      setIsRecording(true);
      return true;
    } catch (err) {
      console.error("Recording cancelled or failed:", err);
      setIsRecording(false);
      return false;
    }
  };

  const handleRecordAndPlay = async () => {
    // 1. Start Recording (User must select screen)
    const success = await startRecording();
    
    // 2. If successful, start the demo
    if (success) {
      // Small delay to let the recording overlay settle
      setTimeout(() => {
        startDirectorMode();
      }, 800);
    }
  };

  // --- AUTOMATION ENGINE ---

  const smoothMoveTo = async (targetX: number, targetY: number, baseDuration: number = 800) => {
    const startX = mousePos.x;
    const startY = mousePos.y;
    const startTime = performance.now();
    
    // Scale duration by speed (slower speed = longer duration)
    const duration = baseDuration / speedRef.current;

    return new Promise<void>((resolve) => {
      const animate = (currentTime: number) => {
        if (!isPlayingRef.current) { resolve(); return; }
        
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        const ease = progress < 0.5 
          ? 4 * progress * progress * progress 
          : 1 - Math.pow(-2 * progress + 2, 3) / 2;

        const newX = startX + (targetX - startX) * ease;
        const newY = startY + (targetY - startY) * ease;

        setMousePos({ x: newX, y: newY });

        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          resolve();
        }
      };
      requestAnimationFrame(animate);
    });
  };

  const getDemoPosition = (key: string) => {
    const cx = window.innerWidth / 2;
    const cy = window.innerHeight / 2;

    if (key.includes('person')) return { x: cx - 200, y: cy - 100 };
    if (key.includes('evidence')) return { x: cx - 200, y: cy + 100 };
    if (key.includes('location')) return { x: cx + 200, y: cy - 100 };
    if (key.includes('ransom')) return { x: cx + 200, y: cy + 100 };
    
    return { x: cx, y: cy };
  };

  const getElementCenter = (selector: string) => {
    // Handle virtual canvas nodes
    if (selector.startsWith('node-')) {
       return getDemoPosition(selector);
    }

    // Try finding by ID first
    let el = document.getElementById(selector) || document.getElementById(selector.replace('#', ''));
    
    // If not found, try querySelector (for classes or complex selectors)
    if (!el) el = document.querySelector(selector);

    if (el) {
      const rect = el.getBoundingClientRect();
      return { 
        x: rect.left + rect.width / 2, 
        y: rect.top + rect.height / 2 
      };
    }
    
    // Fallbacks for known UI elements if ID missing
    if (selector.includes('btn-analyze')) return {x: window.innerWidth - 100, y: 80};
    if (selector.includes('mode-selector')) return {x: window.innerWidth - 250, y: 80};
    if (selector.includes('close-editor')) return {x: window.innerWidth - 40, y: 60};
    if (selector.includes('kidnap-tools')) return {x: 100, y: window.innerHeight - 50};
    
    return { x: window.innerWidth / 2, y: window.innerHeight / 2 };
  };

  const processAction = async (actionString: string) => {
    const parts = actionString.split(':');
    const type = parts[0];

    switch (type) {
      case 'move':
        const moveTarget = getElementCenter(parts[1]);
        await smoothMoveTo(moveTarget.x, moveTarget.y);
        break;

      case 'click':
        const clickTarget = getElementCenter(parts[1]);
        await smoothMoveTo(clickTarget.x, clickTarget.y);
        showClickRipple(clickTarget.x, clickTarget.y);
        
        // Logic Triggers
        if (parts[1] === 'btn-analyze') handleAnalysis();
        if (parts[1] === 'close-editor') onCloseEditor();
        if (parts[1] === 'dash-activate-irt') setSimulationToast({ message: 'Dispatching IRT Units...', type: 'info' });
        
        // Simulating clicks on specific nodes
        if (parts[1].startsWith('node-')) {
             const nodes = getNodes();
             let foundNode: Node | undefined;
             
             if (parts[1].includes('person')) foundNode = nodes.find(n => n.type === NodeType.PERSON);
             else if (parts[1].includes('evidence')) foundNode = nodes.find(n => n.type === NodeType.EVENT && (n.data as any).type === 'evidence');
             else if (parts[1].includes('location')) foundNode = nodes.find(n => n.type === NodeType.EVENT && (n.data as any).type === 'location');
             
             if (foundNode) setSelectedNode(foundNode);
        }
        break;

      case 'drag':
        const sourceId = parts[1];
        const sourcePos = getElementCenter(sourceId);

        await smoothMoveTo(sourcePos.x, sourcePos.y);
        await new Promise(r => setTimeout(r, 200 / speedRef.current)); // Grab delay scaled

        // Destination
        const dropPos = getDemoPosition(sourceId);
        await smoothMoveTo(dropPos.x, dropPos.y, 1000);

        // Logic Drop
        const flowPos = screenToFlowPosition({ x: dropPos.x, y: dropPos.y });
        let newNodeType = NodeType.EVENT;
        let data: any = { label: 'New Item' };

        if (sourceId.includes('person')) {
           newNodeType = NodeType.PERSON;
           data = { label: 'New Person', personStatus: 'unknown' };
        } else if (sourceId.includes('location')) {
           newNodeType = NodeType.EVENT;
           data = { label: 'New Location', location: 'Unknown', type: 'location' };
        } else if (sourceId.includes('evidence')) {
           newNodeType = NodeType.EVENT;
           data = { label: 'New Evidence', type: 'evidence', evidenceType: 'physical', reliability: 1 };
        } else if (sourceId.includes('ransom')) {
           newNodeType = NodeType.EVENT;
           data = { label: 'Ransom Demand', type: 'communication', amount: 50000000 };
        }

        const newNode: Node = {
            id: `demo_node_${Date.now()}`,
            type: newNodeType,
            position: flowPos,
            data: data
        };
        
        setNodes(nds => nds.concat(newNode));
        break;

      case 'edit':
        // Format: edit:targetSelector:fieldName:value
        const targetSelector = parts[1];
        const fieldName = parts[2];
        const value = parts[3];
        const nodes = getNodes();
        
        let targetNode: Node | undefined;
        
        if (targetSelector.includes('person')) targetNode = nodes.find(n => n.type === NodeType.PERSON);
        else if (targetSelector.includes('evidence')) targetNode = nodes.find(n => n.type === NodeType.EVENT && (n.data as any).type === 'evidence');
        else if (targetSelector.includes('location')) targetNode = nodes.find(n => n.type === NodeType.EVENT && (n.data as any).type === 'location');

        if (targetNode) {
            // Determine if value needs parsing (e.g. number)
            let parsedValue: any = value;
            if (fieldName === 'reliability') parsedValue = parseInt(value);
            
            setNodes(nds => nds.map(n => {
                if (n.id === targetNode?.id) {
                    return { ...n, data: { ...n.data, [fieldName]: parsedValue } };
                }
                return n;
            }));
            // Update selected node visually if open
            setSelectedNode({ ...targetNode, data: { ...targetNode.data, [fieldName]: parsedValue } });
        }
        break;

      case 'select':
        if (parts[1] === 'mode') {
           if (parts[2] === 'kidnapping') setManualMode(InvestigationType.KIDNAPPING);
        }
        break;

      case 'connect':
        const sourceKey = parts[1];
        const targetKey = parts[2];

        const startVis = getDemoPosition(sourceKey);
        const endVis = getDemoPosition(targetKey);
        
        await smoothMoveTo(startVis.x, startVis.y);
        showClickRipple(startVis.x, startVis.y); 
        await smoothMoveTo(endVis.x, endVis.y, 800);
        
        const currentNodes = getNodes();
        const findNode = (key: string) => {
            if (key.includes('person')) return currentNodes.find(n => n.type === NodeType.PERSON);
            if (key.includes('location')) return currentNodes.find(n => (n.data as any).type === 'location');
            if (key.includes('evidence')) return currentNodes.find(n => (n.data as any).type === 'evidence');
            if (key.includes('ransom')) return currentNodes.find(n => (n.data as any).type === 'communication');
            return undefined;
        };

        const src = findNode(sourceKey);
        const tgt = findNode(targetKey);

        if (src && tgt) {
             const newEdge: Edge = {
                 id: `e_${src.id}_${tgt.id}`,
                 source: src.id,
                 target: tgt.id,
                 type: 'deletable',
                 animated: true,
                 style: { stroke: '#eab308', strokeWidth: 2 }
             };
             setEdges(eds => eds.concat(newEdge));
        }
        break;

      case 'wait':
        break;
    }
  };

  const showClickRipple = (x: number, y: number) => {
      const ripple = document.createElement('div');
      ripple.className = 'fixed z-[9999] rounded-full bg-amber-500/50 pointer-events-none transform -translate-x-1/2 -translate-y-1/2 transition-all duration-500 ease-out';
      ripple.style.left = `${x}px`;
      ripple.style.top = `${y}px`;
      ripple.style.width = '0px';
      ripple.style.height = '0px';
      document.body.appendChild(ripple);
      
      requestAnimationFrame(() => {
          ripple.style.width = '50px';
          ripple.style.height = '50px';
          ripple.style.opacity = '0';
      });

      setTimeout(() => ripple.remove(), 500);
  };

  const startDirectorMode = async () => {
    setIsPlaying(true);
    isPlayingRef.current = true;
    
    // Reset View for clean start
    setNodes([]); 
    setEdges([]);
    setManualMode(InvestigationType.GENERAL);

    for (const step of DEMO_SCRIPT) {
      if (!isPlayingRef.current) break;
      
      setCurrentSubtitle(step.text);
      if (step.action) await processAction(step.action);

      // Scale wait duration by speed
      const adjustedDuration = step.duration / speedRef.current;
      const chunks = adjustedDuration / 100;
      
      for (let i = 0; i < chunks; i++) {
        if (!isPlayingRef.current) break;
        await new Promise(r => setTimeout(r, 100));
      }
    }

    // Stop execution
    stopDirectorMode();
  };

  const stopDirectorMode = () => {
    setIsPlaying(false);
    isPlayingRef.current = false;
    setCurrentSubtitle("");
    
    // Stop recording if active
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  };

  if (isMinimized) {
    return (
      <div className="fixed bottom-4 right-20 z-50 animate-slide-in-bottom">
        <button 
          onClick={() => setIsMinimized(false)}
          className="bg-slate-800 text-amber-500 p-3 rounded-full shadow-2xl border border-amber-500/50 hover:scale-110 transition-transform relative"
        >
          <Video className="w-6 h-6" />
          {isRecording && (
             <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
             </span>
          )}
        </button>
      </div>
    );
  }

  return (
    <>
      {/* VIRTUAL MOUSE */}
      {isPlaying && (
        <div 
          style={{ 
            position: 'fixed',
            left: mousePos.x, 
            top: mousePos.y,
            pointerEvents: 'none',
            zIndex: 9999,
            transition: 'transform 0.1s',
          }}
        >
          <MousePointer2 className="w-8 h-8 text-black fill-amber-500 -ml-1 -mt-1 drop-shadow-xl" />
        </div>
      )}

      {/* SUBTITLES */}
      {isPlaying && currentSubtitle && (
        <div className="fixed bottom-24 left-0 right-0 flex justify-center z-[9000] pointer-events-none">
          <div className="bg-slate-950/80 backdrop-blur border border-amber-500/30 text-slate-100 px-8 py-4 rounded-xl shadow-2xl text-xl font-medium animate-in slide-in-from-bottom-5 fade-in duration-300 max-w-3xl text-center">
            {currentSubtitle}
          </div>
        </div>
      )}

      {/* CONTROL PANEL */}
      <div className="fixed bottom-4 right-20 z-50 bg-slate-900/90 backdrop-blur border border-slate-700 rounded-xl shadow-2xl w-64 overflow-hidden animate-slide-in-right">
        <div className="flex items-center justify-between px-4 py-3 bg-slate-800/50 border-b border-slate-700">
          <div className="flex items-center gap-2">
            <Video className="w-4 h-4 text-amber-500" />
            <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">Director Mode</span>
            {isRecording && (
              <span className="flex h-2 w-2 relative ml-1">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
              </span>
            )}
          </div>
          <button onClick={() => setIsMinimized(true)} className="text-slate-400 hover:text-white">
            <Minimize2 className="w-4 h-4" />
          </button>
        </div>
        
        <div className="p-4">
          {!isPlaying && (
            <div className="mb-4">
               <div className="flex items-center gap-2 mb-2 text-xs font-bold text-slate-500 uppercase">
                  <Gauge className="w-3 h-3" /> Playback Speed
               </div>
               <div className="grid grid-cols-4 gap-1">
                 {[0.5, 0.75, 1.0, 1.5].map((s) => (
                   <button
                     key={s}
                     onClick={() => setPlaybackSpeed(s)}
                     className={`text-xs py-1 rounded border transition-colors ${
                       playbackSpeed === s 
                         ? 'bg-amber-500/20 border-amber-500 text-amber-400 font-bold' 
                         : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'
                     }`}
                   >
                     {s}x
                   </button>
                 ))}
               </div>
               <div className="text-[10px] text-slate-500 mt-1 text-center italic">
                 {playbackSpeed < 1 ? "Slowed down for reading/voiceover" : "Normal presentation speed"}
               </div>
            </div>
          )}

          {!isPlaying ? (
            <div className="space-y-2">
              <button 
                onClick={startDirectorMode}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-lg bg-gradient-to-r from-amber-600 to-amber-500 text-white font-bold shadow-lg hover:brightness-110 transition-all active:scale-95"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Play Demo Reel</span>
              </button>
              
              <button 
                onClick={handleRecordAndPlay}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-slate-800 text-red-400 font-bold border border-red-900/50 hover:bg-red-900/20 transition-all active:scale-95 text-xs"
              >
                <Disc className="w-4 h-4" />
                <span>Record & Play (Save Video)</span>
              </button>
            </div>
          ) : (
            <button 
              onClick={stopDirectorMode}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-lg bg-red-600 text-white font-bold shadow-lg hover:bg-red-500 transition-all animate-pulse"
            >
              <Square className="w-4 h-4 fill-current" />
              <span>Stop Demo</span>
            </button>
          )}

          <div className="mt-3 text-center">
             <span className="text-[10px] text-slate-500 uppercase font-bold">
               {isPlaying ? "Script Running..." : "Ready to Start"}
             </span>
          </div>
        </div>
      </div>
    </>
  );
};