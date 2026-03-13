import React, { useEffect, useState, useRef } from 'react';
import { Node, Edge } from '@xyflow/react';
import { NodeData, PersonStatus, EvidenceType, NodeType } from '../types';
import { X, Save, Trash2, Link2, Type, AlertCircle, Shield, Star, UserCheck, ImagePlus, Map, Video, Mic, Paperclip, Layout, Plus } from 'lucide-react';

interface EditorPanelProps {
  selectedNode: Node | null;
  selectedEdge: Edge | null;
  setNodes: React.Dispatch<React.SetStateAction<Node[]>>;
  setEdges: React.Dispatch<React.SetStateAction<Edge[]>>;
  onClose: () => void;
  deleteNode: (id: string) => void;
  deleteEdge: (id: string) => void;
}

export const EditorPanel: React.FC<EditorPanelProps> = ({ 
  selectedNode, 
  selectedEdge, 
  setNodes, 
  setEdges, 
  onClose, 
  deleteNode, 
  deleteEdge 
}) => {
  const imageInputRef = useRef<HTMLInputElement>(null);
  // Refs for the 4 separate upload slots
  const slotRefs = useRef<(HTMLInputElement | null)[]>([]);
  
  // Form state for Nodes
  const [nodeFormData, setNodeFormData] = useState<NodeData>({
    label: '',
    date: '',
    evidenceSource: '',
    amount: 0,
    location: '',
    aliases: '',
    personStatus: 'unknown',
    evidenceType: undefined,
    reliability: 0,
    coordinates: { lat: 0, lng: 0 },
    image: '',
    images: ['', '', '', ''], // Initialize 4 slots
    attachments: [],
    noteColor: '#fef3c7',
    type: 'event' // default for EventNodes
  });

  // Form state for Edges
  const [edgeFormData, setEdgeFormData] = useState({
    label: '',
    color: '#64748b'
  });

  // Sync state when selection changes
  useEffect(() => {
    if (selectedNode) {
      // Ensure images array has 4 slots
      let loadedImages = (selectedNode.data.images as string[]) || [];
      // Backward compatibility: if data.image exists but images array is empty, put it in slot 0
      if (loadedImages.length === 0 && selectedNode.data.image) {
        loadedImages = [selectedNode.data.image as string];
      }
      // Pad to 4
      while (loadedImages.length < 4) loadedImages.push('');

      setNodeFormData({
        label: selectedNode.data.label as string || '',
        date: (selectedNode.data.date as string) || '',
        evidenceSource: (selectedNode.data.evidenceSource as string) || '',
        amount: (selectedNode.data.amount as number) || 0,
        location: (selectedNode.data.location as string) || '',
        aliases: (selectedNode.data.aliases as string) || '',
        personStatus: (selectedNode.data.personStatus as PersonStatus) || 'unknown',
        evidenceType: (selectedNode.data.evidenceType as EvidenceType) || undefined,
        reliability: (selectedNode.data.reliability as number) || 0,
        role: (selectedNode.data.role as string) || '',
        coordinates: (selectedNode.data.coordinates as any) || { lat: 0, lng: 0 },
        image: (selectedNode.data.image as string) || '',
        images: loadedImages,
        attachments: (selectedNode.data.attachments as any[]) || [],
        noteColor: (selectedNode.data.noteColor as string) || '#fef3c7',
        type: (selectedNode.data.type as string) || 'event'
      });
    }
  }, [selectedNode]);

  useEffect(() => {
    if (selectedEdge) {
      setEdgeFormData({
        label: (selectedEdge.label as string) || '',
        color: selectedEdge.style?.stroke as string || '#64748b',
      });
    }
  }, [selectedEdge]);

  // Generic Update Wrapper
  const updateNode = (field: string, value: any) => {
    setNodeFormData(prev => ({ ...prev, [field]: value }));
    setNodes((nds) => 
      nds.map((node) => {
        if (node.id === selectedNode?.id) {
          return {
            ...node,
            data: { ...node.data, [field]: value },
          };
        }
        return node;
      })
    );
  };

  const handleNodeChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    updateNode(e.target.name, e.target.value);
  };

  const handleCoordinatesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const val = parseFloat(value);
    const newCoords = { ...nodeFormData.coordinates, [name]: isNaN(val) ? 0 : val } as any;
    updateNode('coordinates', newCoords);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, index?: number) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        
        if (index !== undefined) {
          // Handle Multi-Image Upload
          const newImages = [...(nodeFormData.images || ['', '', '', ''])];
          newImages[index] = result;
          
          updateNode('images', newImages);
          
          // Sync primary image with first non-empty slot for backward compat
          const firstImage = newImages.find(img => img !== '') || '';
          updateNode('image', firstImage);
        } else {
          // Legacy single upload (Person node)
          updateNode('image', result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = (index: number) => {
    const newImages = [...(nodeFormData.images || ['', '', '', ''])];
    newImages[index] = '';
    updateNode('images', newImages);
    const firstImage = newImages.find(img => img !== '') || '';
    updateNode('image', firstImage);
  };

  // Mock function for media attachments since we don't have backend storage for videos
  const addMockAttachment = (type: 'video' | 'audio') => {
    const newAttachment = {
      id: Date.now().toString(),
      type,
      name: `New ${type} Record`,
      url: '#' // Placeholder
    };
    const newAttachments = [...(nodeFormData.attachments || []), newAttachment];
    updateNode('attachments', newAttachments);
  };

  const handleEdgeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (name === 'label') {
      setEdgeFormData(prev => ({ ...prev, label: value }));
      setEdges((eds) => 
        eds.map((edge) => {
          if (edge.id === selectedEdge?.id) {
            return { ...edge, label: value };
          }
          return edge;
        })
      );
    }
  };

  const handleColorChange = (color: string) => {
    setEdgeFormData(prev => ({ ...prev, color }));
    setEdges((eds) => 
      eds.map((edge) => {
        if (edge.id === selectedEdge?.id) {
          return { 
            ...edge, 
            style: { ...edge.style, stroke: color, strokeWidth: 2 },
            animated: true
          };
        }
        return edge;
      })
    );
  };

  if (!selectedNode && !selectedEdge) return null;

  return (
    <div className="absolute right-4 top-4 w-80 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden flex flex-col animate-slide-in-right z-50">
      <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-800/50">
        <h2 className="font-semibold text-slate-100 flex items-center gap-2">
          {selectedNode ? (
            <>Details: <span className="text-amber-500 uppercase text-xs border border-amber-500/30 px-1.5 py-0.5 rounded">{selectedNode.type === NodeType.NOTE ? 'Note' : selectedNode.type === NodeType.PERSON ? 'Person' : 'Entity'}</span></>
          ) : (
            <>Connection Details</>
          )}
        </h2>
        <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="p-4 space-y-4 max-h-[80vh] overflow-y-auto custom-scrollbar">
        {/* --- NODE EDITOR --- */}
        {selectedNode && (
          <>
            {selectedNode.type === NodeType.NOTE ? (
              <>
                 <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wide">Note Content</label>
                  <textarea
                    name="label"
                    value={nodeFormData.label}
                    onChange={handleNodeChange}
                    rows={6}
                    className="w-full bg-slate-950 border border-slate-700 rounded-md px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-amber-500 transition-colors placeholder:text-slate-600 resize-none"
                    placeholder="Type your notes here..."
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wide">Note Color</label>
                  <div className="flex gap-2">
                    {['#fef3c7', '#dcfce7', '#dbeafe', '#fce7f3'].map(c => (
                       <button
                         key={c}
                         onClick={() => updateNode('noteColor', c)}
                         className={`w-6 h-6 rounded-full border border-slate-600 ${nodeFormData.noteColor === c ? 'ring-2 ring-white' : ''}`}
                         style={{ backgroundColor: c }}
                       />
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* Image Upload for Persons (Single) */}
                {selectedNode.type === NodeType.PERSON && (
                  <div className="flex items-center gap-4 p-3 bg-slate-800/50 rounded border border-slate-700">
                     <div 
                        className="w-16 h-16 rounded bg-slate-900 border border-slate-600 flex items-center justify-center overflow-hidden cursor-pointer hover:border-amber-500 transition-colors relative group"
                        onClick={() => imageInputRef.current?.click()}
                     >
                        {nodeFormData.image ? (
                          <img src={nodeFormData.image} alt="Subject" className="w-full h-full object-cover" />
                        ) : (
                          <ImagePlus className="w-6 h-6 text-slate-500 group-hover:text-amber-500" />
                        )}
                        <input type="file" ref={imageInputRef} onChange={(e) => handleImageUpload(e)} accept="image/*" className="hidden" />
                     </div>
                     <div className="flex-1">
                        <div className="text-xs font-bold text-slate-300">Subject Photo</div>
                        <div className="text-[10px] text-slate-500">Click to upload image. (Stored locally)</div>
                     </div>
                  </div>
                )}

                {/* Category Switcher for Events */}
                {selectedNode.type === NodeType.EVENT && (
                   <div>
                       <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wide flex items-center gap-2">
                         <Layout className="w-3 h-3" /> Entity Category
                       </label>
                       <select
                         name="type"
                         value={nodeFormData.type || 'event'}
                         onChange={handleNodeChange}
                         className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                       >
                         <option value="event">Generic Event</option>
                         <option value="location">Location / Site</option>
                         <option value="evidence">Evidence Item</option>
                         <option value="communication">Communication Log</option>
                       </select>
                   </div>
                )}

                {/* Multi-Image Upload for Events */}
                {selectedNode.type === NodeType.EVENT && (
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wide flex items-center gap-2">
                       <ImagePlus className="w-3 h-3" /> Evidence / Site Photos
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {[0, 1, 2, 3].map((index) => (
                        <div key={index} className="relative group">
                           <div 
                              className={`
                                h-20 rounded border flex items-center justify-center cursor-pointer transition-all overflow-hidden
                                ${nodeFormData.images && nodeFormData.images[index] 
                                  ? 'bg-slate-900 border-slate-600 hover:border-red-500' 
                                  : 'bg-slate-800/50 border-slate-700 border-dashed hover:bg-slate-800 hover:border-amber-500'}
                              `}
                              onClick={() => {
                                if (nodeFormData.images && nodeFormData.images[index]) return; // Don't trigger upload if image exists (use delete btn)
                                slotRefs.current[index]?.click();
                              }}
                           >
                              {nodeFormData.images && nodeFormData.images[index] ? (
                                <img src={nodeFormData.images[index]} alt={`Slot ${index}`} className="w-full h-full object-cover" />
                              ) : (
                                <div className="flex flex-col items-center gap-1">
                                  <Plus className="w-4 h-4 text-slate-500" />
                                  <span className="text-[9px] text-slate-500">Add Photo</span>
                                </div>
                              )}
                              
                              {/* Hidden Input */}
                              <input 
                                type="file" 
                                ref={(el) => { slotRefs.current[index] = el; }} 
                                onChange={(e) => handleImageUpload(e, index)} 
                                accept="image/*" 
                                className="hidden" 
                              />
                           </div>
                           
                           {/* Remove Button Overlay */}
                           {nodeFormData.images && nodeFormData.images[index] && (
                             <div 
                                className="absolute inset-0 bg-red-900/80 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity cursor-pointer"
                                onClick={() => removeImage(index)}
                             >
                               <Trash2 className="w-5 h-5 text-white" />
                             </div>
                           )}
                        </div>
                      ))}
                    </div>
                    <div className="text-[10px] text-slate-500 mt-1 italic">Click empty slot to upload. Hover to delete.</div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wide">
                    {selectedNode.type === NodeType.PERSON ? 'Name / Subject' : 'Title'}
                  </label>
                  <input
                    type="text"
                    name="label"
                    value={nodeFormData.label}
                    onChange={handleNodeChange}
                    className="w-full bg-slate-950 border border-slate-700 rounded-md px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-amber-500 transition-colors placeholder:text-slate-600 font-bold"
                    placeholder={selectedNode.type === NodeType.PERSON ? "Subject Name" : "Incident Name"}
                  />
                </div>

                {/* PERSON SPECIFIC FIELDS */}
                {selectedNode.type === NodeType.PERSON && (
                  <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700 space-y-3">
                    <h3 className="text-xs font-bold text-slate-400 uppercase flex items-center gap-2">
                      <UserCheck className="w-3 h-3" /> Identity Profile
                    </h3>
                    
                    <div>
                      <label className="block text-[10px] text-slate-500 mb-1">Status</label>
                      <select
                        name="personStatus"
                        value={nodeFormData.personStatus}
                        onChange={handleNodeChange}
                        className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                      >
                        <option value="unknown">Unknown</option>
                        <option value="suspect">🔴 Suspect</option>
                        <option value="victim">🔵 Victim</option>
                        <option value="witness">🟡 Witness</option>
                        <option value="informant">🟢 Informant</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] text-slate-500 mb-1">Aliases / Monikers</label>
                      <input
                        type="text"
                        name="aliases"
                        value={nodeFormData.aliases}
                        onChange={handleNodeChange}
                        className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                        placeholder='"The Ghost", "Junior"'
                      />
                    </div>
                  </div>
                )}

                {/* EVENT/LOCATION/EVIDENCE FIELDS */}
                {selectedNode.type === NodeType.EVENT && (
                  <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700 space-y-3">
                    <h3 className="text-xs font-bold text-slate-400 uppercase flex items-center gap-2">
                      <Shield className="w-3 h-3" /> Evidence Metadata
                    </h3>

                    {/* Media Attachments Section (Video/Audio) */}
                    <div>
                       <label className="block text-[10px] text-slate-500 mb-1">Evidence Media</label>
                       <div className="flex gap-2">
                          <button 
                            onClick={() => addMockAttachment('video')}
                            className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-slate-900 border border-slate-600 rounded hover:border-blue-500 hover:text-blue-400 transition-colors text-[10px] text-slate-400"
                          >
                             <Video className="w-3 h-3" /> Add Video
                          </button>
                          <button 
                            onClick={() => addMockAttachment('audio')}
                            className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-slate-900 border border-slate-600 rounded hover:border-amber-500 hover:text-amber-400 transition-colors text-[10px] text-slate-400"
                          >
                             <Mic className="w-3 h-3" /> Add Voice
                          </button>
                       </div>
                       {nodeFormData.attachments && nodeFormData.attachments.length > 0 && (
                          <div className="mt-2 space-y-1">
                             {nodeFormData.attachments.map((att, i) => (
                                <div key={i} className="flex items-center justify-between text-[10px] bg-slate-900 px-2 py-1 rounded">
                                   <div className="flex items-center gap-2">
                                     <Paperclip className="w-3 h-3 text-slate-500" />
                                     <span className="text-slate-300">{att.name}</span>
                                   </div>
                                   <span className="text-slate-600 italic">Attached</span>
                                </div>
                             ))}
                          </div>
                       )}
                       <p className="text-[9px] text-slate-500 mt-1 italic">
                         * Large media requires backend server. Links stored locally.
                       </p>
                    </div>

                    <div>
                        <label className="block text-[10px] text-slate-500 mb-1">Evidence Type</label>
                        <select
                          name="evidenceType"
                          value={nodeFormData.evidenceType}
                          onChange={handleNodeChange}
                          className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                        >
                          <option value="">-- Select Type --</option>
                          <option value="physical">Physical (Item/DNA)</option>
                          <option value="digital">Digital (Log/Phone)</option>
                          <option value="testimonial">Testimonial</option>
                          <option value="forensic">Forensic Report</option>
                          <option value="circumstantial">Circumstantial</option>
                        </select>
                    </div>

                    <div>
                      <label className="block text-[10px] text-slate-500 mb-1">Reliability / Confidence</label>
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((score) => (
                          <button
                            key={score}
                            onClick={() => updateNode('reliability', score)}
                            className={`p-1 rounded hover:bg-slate-700 transition-colors ${
                                (nodeFormData.reliability || 0) >= score ? 'text-emerald-400' : 'text-slate-600'
                            }`}
                          >
                            <Star className={`w-4 h-4 ${(nodeFormData.reliability || 0) >= score ? 'fill-current' : ''}`} />
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* COMMON FIELDS */}
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wide">Date & Time</label>
                  <input
                    type="datetime-local"
                    name="date"
                    value={nodeFormData.date}
                    onChange={handleNodeChange}
                    className="w-full bg-slate-950 border border-slate-700 rounded-md px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-amber-500 transition-colors placeholder:text-slate-600 [color-scheme:dark]"
                  />
                </div>

                {selectedNode.type === NodeType.EVENT && (
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wide flex items-center gap-2">
                       <Map className="w-3 h-3" /> Location & Coordinates
                    </label>
                    <input
                      type="text"
                      name="location"
                      value={nodeFormData.location}
                      onChange={handleNodeChange}
                      className="w-full bg-slate-950 border border-slate-700 rounded-md px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-amber-500 transition-colors placeholder:text-slate-600 mb-2"
                      placeholder="Address / Area Name"
                    />
                    <div className="flex gap-2">
                       <div className="flex-1 relative">
                          <label className="absolute -top-1.5 left-2 bg-slate-900 px-1 text-[8px] text-slate-500 uppercase font-bold">Lat</label>
                          <input
                            type="number"
                            name="lat"
                            value={nodeFormData.coordinates?.lat}
                            onChange={handleCoordinatesChange}
                            className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-2 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-blue-500"
                            placeholder="0.000000"
                            step="0.000001"
                          />
                       </div>
                       <div className="flex-1 relative">
                          <label className="absolute -top-1.5 left-2 bg-slate-900 px-1 text-[8px] text-slate-500 uppercase font-bold">Long</label>
                          <input
                            type="number"
                            name="lng"
                            value={nodeFormData.coordinates?.lng}
                            onChange={handleCoordinatesChange}
                            className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-2 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-blue-500"
                            placeholder="0.000000"
                            step="0.000001"
                          />
                       </div>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wide">Source / Notes</label>
                  <textarea
                    name="evidenceSource"
                    value={nodeFormData.evidenceSource}
                    onChange={handleNodeChange}
                    rows={3}
                    className="w-full bg-slate-950 border border-slate-700 rounded-md px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-amber-500 transition-colors placeholder:text-slate-600 resize-none"
                    placeholder="e.g. Witness Testimony #402, CCTV Footage"
                  />
                </div>
              </>
            )}
          </>
        )}

        {/* --- EDGE EDITOR --- */}
        {selectedEdge && (
          <>
             <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wide flex items-center gap-2">
                <Type className="w-3 h-3" /> Relationship Label
              </label>
              <input
                type="text"
                name="label"
                value={edgeFormData.label}
                onChange={handleEdgeChange}
                className="w-full bg-slate-950 border border-slate-700 rounded-md px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-amber-500 transition-colors placeholder:text-slate-600"
                placeholder="e.g. Suspect, Witnessed, Financed..."
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-2 uppercase tracking-wide flex items-center gap-2">
                <Link2 className="w-3 h-3" /> Connection Type
              </label>
              <div className="flex gap-2">
                {['#64748b', '#ef4444', '#3b82f6', '#eab308', '#10b981'].map((c) => (
                  <button
                    key={c}
                    onClick={() => handleColorChange(c)}
                    className={`w-8 h-8 rounded-full hover:scale-110 transition-transform ring-2 ${
                      edgeFormData.color === c ? 'ring-white' : 'ring-transparent'
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
          </>
        )}

        <div className="pt-4 mt-2 border-t border-slate-800 flex justify-between">
           <button 
             onClick={() => {
               if (selectedNode) deleteNode(selectedNode.id);
               if (selectedEdge) deleteEdge(selectedEdge.id);
             }}
             className="flex items-center gap-2 px-3 py-2 rounded-md bg-red-900/20 text-red-400 text-sm hover:bg-red-900/40 transition-colors border border-red-900/50"
           >
            <Trash2 className="w-4 h-4" />
            Delete
           </button>
           
           <button 
             onClick={onClose}
             className="flex items-center gap-2 px-4 py-2 rounded-md bg-slate-800 text-slate-200 text-sm hover:bg-slate-700 transition-colors"
           >
            <Save className="w-4 h-4" />
            Done
           </button>
        </div>
      </div>
    </div>
  );
};