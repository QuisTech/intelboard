import React, { memo } from 'react';
import { Handle, Position, BaseEdge, EdgeLabelRenderer, getBezierPath, useReactFlow, EdgeProps, NodeToolbar, NodeResizer } from '@xyflow/react';
import { Calendar, FileText, User, AlertCircle, X, Shield, Fingerprint, Star, Eye, Skull, Radio, Mic2, Map, ExternalLink, StickyNote, Paperclip, Building2, MapPin, FileSearch } from 'lucide-react';
import { NodeData, PersonStatus, EvidenceType } from '../types';

interface BaseNodeWrapperProps {
  children?: React.ReactNode;
  selected?: boolean;
  headerColor: string;
  title: string;
  icon: React.ElementType;
  borderColor?: string;
  statusBadge?: React.ReactNode;
  toolbarContent?: React.ReactNode;
}

// Wrapper for common node styling
const BaseNodeWrapper = ({ 
  children, 
  selected, 
  headerColor,
  title,
  icon: Icon,
  borderColor,
  statusBadge,
  toolbarContent
}: BaseNodeWrapperProps) => (
  <>
    <NodeResizer 
      color="#f59e0b" 
      isVisible={selected} 
      minWidth={220} 
      minHeight={100} 
    />
    <div className={`
      w-full h-full min-w-[220px] min-h-[100px] bg-slate-900 border-2 rounded-lg shadow-xl overflow-hidden transition-all duration-200 group flex flex-col
      ${selected ? 'border-amber-400 ring-2 ring-amber-400/20' : borderColor || 'border-slate-700 hover:border-slate-500'}
    `}>
      {/* Pop-out Info (Snapchat style) using NodeToolbar */}
      <NodeToolbar isVisible={selected} position={Position.Top} className="mb-2">
         <div className="bg-slate-950 border border-amber-500/50 text-slate-200 px-3 py-2 rounded-lg shadow-2xl flex items-center gap-4 animate-in slide-in-from-bottom-2">
           {toolbarContent || <span className="text-xs text-slate-400">Select to edit details</span>}
         </div>
      </NodeToolbar>

      {/* Header - Fixed Height */}
      <div className={`${headerColor} px-3 py-2 flex items-center justify-between border-b border-slate-700/50 shrink-0 h-10`}>
        <div className="flex items-center gap-2 overflow-hidden">
          <Icon className="w-4 h-4 text-white shrink-0" />
          <span className="font-bold text-xs uppercase tracking-wider text-white truncate">{title}</span>
        </div>
        {statusBadge}
      </div>
      
      {/* Body - Flexible Height with Scroll if absolutely necessary, but hidden overflow by default */}
      <div className="p-3 flex-1 overflow-hidden flex flex-col relative">
        {children}
      </div>

      {/* Handles */}
      <Handle type="target" position={Position.Top} className="!bg-slate-400 !w-3 !h-3" />
      <Handle type="source" position={Position.Bottom} className="!bg-slate-400 !w-3 !h-3" />
      <Handle type="target" position={Position.Left} className="!bg-slate-400 !w-3 !h-3" />
      <Handle type="source" position={Position.Right} className="!bg-slate-400 !w-3 !h-3" />
    </div>
  </>
);

// Helper to render reliability stars
const ReliabilityStars = ({ score }: { score?: number }) => {
  if (!score) return null;
  return (
    <div className="flex gap-0.5" title={`Reliability: ${score}/5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <div 
          key={i} 
          className={`w-1.5 h-1.5 rounded-full ${i <= score ? 'bg-emerald-400' : 'bg-slate-700'}`} 
        />
      ))}
    </div>
  );
};

export const NoteNode = memo(({ data, selected }: { data: NodeData; selected?: boolean }) => {
  return (
    <>
      <NodeResizer 
        color="#3b82f6" 
        isVisible={selected} 
        minWidth={150} 
        minHeight={100} 
      />
      <div className={`
        w-full h-full min-w-[150px] min-h-[100px] p-4 rounded-lg shadow-xl text-slate-900 font-medium text-sm transition-all overflow-hidden flex flex-col
        ${selected ? 'ring-2 ring-blue-400' : ''}
      `}
      style={{ backgroundColor: data.noteColor || '#fef3c7' }} // Default yellow
      >
        <div className="flex items-center gap-2 mb-2 text-slate-700/50 uppercase text-[10px] font-bold shrink-0">
          <StickyNote className="w-3 h-3" />
          <span>Field Note</span>
        </div>
        {/* Allow text to scroll inside the note if resized too small, or clip it */}
        <div className="whitespace-pre-wrap leading-relaxed font-handwriting overflow-y-auto custom-scrollbar flex-1">
          {data.label || 'Enter note...'}
        </div>
         {/* Handles */}
        <Handle type="target" position={Position.Top} className="!bg-slate-400/50 !w-2 !h-2" />
        <Handle type="source" position={Position.Bottom} className="!bg-slate-400/50 !w-2 !h-2" />
      </div>
    </>
  );
});

export const EventNode = memo(({ data, selected }: { data: NodeData; selected?: boolean }) => {
  
  // DETERMINE SUB-TYPE STYLING
  const getSubtypeConfig = () => {
    switch (data.type) {
      case 'location':
        return { 
          header: 'bg-emerald-600', 
          title: 'LOCATION', 
          icon: MapPin 
        };
      case 'evidence':
        return { 
          header: 'bg-purple-600', 
          title: 'EVIDENCE', 
          icon: FileSearch 
        };
      case 'communication':
        return { 
          header: 'bg-red-500', 
          title: 'COMMUNICATION', 
          icon: Radio 
        };
      default:
        return { 
          header: 'bg-blue-600', 
          title: 'EVENT', 
          icon: Calendar 
        };
    }
  };

  const config = getSubtypeConfig();

  const getEvidenceIcon = (type?: EvidenceType) => {
    switch (type) {
      case 'physical': return <Shield className="w-3 h-3 text-purple-400" />;
      case 'digital': return <Radio className="w-3 h-3 text-blue-400" />;
      case 'testimonial': return <Mic2 className="w-3 h-3 text-amber-400" />;
      case 'forensic': return <Fingerprint className="w-3 h-3 text-red-400" />;
      default: return null;
    }
  };

  const openMap = (e: React.MouseEvent) => {
    e.stopPropagation();
    if(data.coordinates) {
      window.open(`https://www.google.com/maps/search/?api=1&query=${data.coordinates.lat},${data.coordinates.lng}`, '_blank');
    }
  };

  const Toolbar = () => (
    <div className="flex items-center gap-3">
      <div className="flex flex-col">
         <span className="text-[10px] text-slate-400 uppercase">Reliability</span>
         <span className="text-sm font-bold text-emerald-400">{data.reliability ? `${data.reliability}/5 Verified` : 'Unverified'}</span>
      </div>
      <div className="w-px h-6 bg-slate-800" />
      <div className="flex flex-col">
         <span className="text-[10px] text-slate-400 uppercase">Attachments</span>
         <span className="text-sm font-bold text-blue-400">{data.attachments?.length || 0} Files</span>
      </div>
    </div>
  );

  const { lat, lng } = data.coordinates || { lat: 0, lng: 0 };
  const hasCoordinates = lat !== 0 || lng !== 0;

  // Image Logic: Prioritize array, fall back to single legacy
  const displayImages = data.images && data.images.filter(i => i).length > 0 
    ? data.images.filter(i => i) 
    : (data.image ? [data.image] : []);

  return (
    <BaseNodeWrapper 
      selected={selected} 
      headerColor={config.header}
      title={config.title} 
      icon={config.icon}
      statusBadge={<ReliabilityStars score={data.reliability} />}
      toolbarContent={<Toolbar />}
    >
      <div className="flex flex-col gap-2 h-full">
        {/* Label: Truncated to max 2 lines to prevent elongation */}
        <div className="text-sm font-semibold text-slate-100 leading-tight line-clamp-2" title={data.label}>
          {data.label || 'Untitled Node'}
        </div>
        
        {data.evidenceType && (
          <div className="flex items-center gap-1.5 px-2 py-1 bg-slate-800 rounded text-[10px] uppercase font-bold text-slate-300 w-fit shrink-0">
            {getEvidenceIcon(data.evidenceType)}
            {data.evidenceType}
          </div>
        )}

        <div className="flex flex-col gap-1 mt-1 overflow-hidden">
          {data.date && (
            <div className="flex items-center gap-1.5 text-xs text-blue-300 shrink-0">
              <Calendar className="w-3 h-3" />
              <span className="truncate">{data.date.replace('T', ' ')}</span>
            </div>
          )}

          {data.location && (
             <div className="flex items-center gap-1.5 text-xs text-slate-400 shrink-0">
               <div className="w-3 text-center">📍</div>
               <span className="truncate">{data.location}</span>
             </div>
          )}

          {/* MULTI-IMAGE DISPLAY GRID */}
          {displayImages.length > 0 && (
             <div className={`
               w-full shrink-0 rounded bg-slate-800 border border-slate-700 overflow-hidden relative my-1 group/image
               ${displayImages.length === 1 ? 'h-32' : 'h-36 grid grid-cols-2 gap-0.5'}
             `}>
                {displayImages.map((img, idx) => (
                  <img 
                    key={idx}
                    src={img} 
                    alt={`Evidence ${idx}`} 
                    className={`w-full h-full object-cover transition-transform hover:scale-110 ${displayImages.length === 3 && idx === 0 ? 'col-span-2' : ''}`}
                  />
                ))}
             </div>
          )}

          {/* MAP SNAPSHOT (OpenStreetMap) */}
          {hasCoordinates && (
            <div className="w-full h-28 shrink-0 rounded bg-slate-800 border border-slate-700 overflow-hidden relative my-2 group/map">
              {/* Embed OSM via iframe */}
              <iframe 
                width="100%" 
                height="100%" 
                frameBorder="0" 
                scrolling="no" 
                marginHeight={0} 
                marginWidth={0} 
                loading="lazy"
                src={`https://www.openstreetmap.org/export/embed.html?bbox=${lng-0.01}%2C${lat-0.01}%2C${lng+0.01}%2C${lat+0.01}&layer=mapnik&marker=${lat}%2C${lng}`} 
                style={{ pointerEvents: 'none', filter: 'grayscale(0.3) contrast(1.1)' }}
                title="Location Snapshot"
              />
              {/* Overlay for Dragging/Clicking */}
              <div 
                  className="absolute inset-0 bg-transparent hover:bg-slate-900/10 transition-colors"
                  title="Map Preview (Coords Loaded)"
              />
            </div>
          )}

          {/* GIS Link Button with Coords */}
          {hasCoordinates && (
             <div className="flex items-center gap-2 mt-1 shrink-0 flex-wrap">
               <button 
                  onClick={openMap}
                  className="flex items-center gap-1.5 text-[10px] text-emerald-400 bg-emerald-900/20 px-1.5 py-0.5 rounded border border-emerald-900/50 hover:bg-emerald-900/40 transition-colors"
                  title="Open in Google Maps"
               >
                 <Map className="w-3 h-3" />
                 <span>Open Maps</span>
                 <ExternalLink className="w-2 h-2 ml-1" />
               </button>
               <span className="text-[10px] text-slate-500 font-mono">
                 {lat.toFixed(5)}, {lng.toFixed(5)}
               </span>
             </div>
          )}
        </div>
        
        {data.attachments && data.attachments.length > 0 && (
          <div className="flex items-center gap-1 mt-auto pt-1 shrink-0">
             <Paperclip className="w-3 h-3 text-slate-500" />
             <span className="text-[10px] text-slate-500">{data.attachments.length} attachments</span>
          </div>
        )}

        {/* Source: Truncated to 2 lines to prevent elongation */}
        {data.evidenceSource && (
          <div className="flex items-start gap-1.5 text-[10px] text-slate-500 mt-1 pt-2 border-t border-slate-800/50 shrink-0">
            <FileText className="w-3 h-3 mt-0.5 shrink-0" />
            <span className="italic line-clamp-2" title={data.evidenceSource}>{data.evidenceSource}</span>
          </div>
        )}
      </div>
    </BaseNodeWrapper>
  );
});

export const PersonNode = memo(({ data, selected }: { data: NodeData; selected?: boolean }) => {
  
  const getStatusStyles = (status?: PersonStatus, type?: string) => {
    // Handle Organization Override
    if (type === 'organization') {
        return { color: 'bg-slate-700', border: 'border-slate-500', icon: Building2, label: 'ORGANIZATION' };
    }

    switch (status) {
      case 'suspect': return { color: 'bg-red-600', border: 'border-red-500/50', icon: Skull, label: 'SUSPECT' };
      case 'victim': return { color: 'bg-blue-600', border: 'border-blue-500/50', icon: Shield, label: 'VICTIM' };
      case 'witness': return { color: 'bg-amber-600', border: 'border-amber-500/50', icon: Eye, label: 'WITNESS' };
      case 'informant': return { color: 'bg-emerald-600', border: 'border-emerald-500/50', icon: Radio, label: 'INFORMANT' };
      default: return { color: 'bg-slate-600', border: 'border-slate-700', icon: User, label: 'PERSON' };
    }
  };

  const styles = getStatusStyles(data.personStatus, data.type);
  const StatusIcon = styles.icon;

  const Toolbar = () => (
    <div className="flex items-center gap-3">
       {/* Tiny thumbnail in toolbar */}
       {data.image && <img src={data.image} alt="Thumb" className="w-8 h-8 rounded bg-slate-800 object-cover" />}
       <div className="flex flex-col">
         <span className="text-[10px] text-slate-400 uppercase">Role</span>
         <span className={`text-sm font-bold ${data.personStatus === 'suspect' ? 'text-red-400' : 'text-slate-200'}`}>
            {styles.label}
         </span>
       </div>
       <div className="w-px h-6 bg-slate-800" />
       <div className="flex flex-col">
         <span className="text-[10px] text-slate-400 uppercase">Aliases</span>
         <span className="text-sm font-bold text-slate-200">{data.aliases ? data.aliases.split(',').length : 0} Known</span>
      </div>
    </div>
  );

  return (
    <BaseNodeWrapper 
      selected={selected} 
      headerColor={styles.color}
      borderColor={styles.border}
      title={styles.label} 
      icon={StatusIcon}
      toolbarContent={<Toolbar />}
    >
      <div className="flex flex-col gap-2 h-full">
        <div className="flex items-start gap-3 shrink-0">
          {/* IMAGE DISPLAY */}
          {data.image ? (
            <img 
              src={data.image} 
              alt={data.label} 
              className="w-12 h-12 rounded bg-slate-800 object-cover border border-slate-600 shrink-0" 
            />
          ) : (
            <div className="w-12 h-12 rounded bg-slate-800 flex items-center justify-center text-slate-600 border border-slate-700 shrink-0">
               {data.type === 'organization' ? <Building2 className="w-6 h-6" /> : <User className="w-6 h-6" />}
            </div>
          )}

          <div className="overflow-hidden">
            <div className="text-sm font-bold text-slate-100 leading-tight truncate" title={data.label}>
              {data.label || 'Unknown'}
            </div>
            {data.aliases && (
              <div className="text-xs text-slate-400 italic mt-0.5 truncate">
                aka "{data.aliases}"
              </div>
            )}
          </div>
        </div>

        {data.role && data.role.toUpperCase() !== styles.label && (
          <div className="text-[10px] uppercase tracking-wide bg-slate-800 px-1.5 py-0.5 rounded w-fit text-slate-400 shrink-0">
            {data.role}
          </div>
        )}

        <div className="flex-1 min-h-0">
           {data.date && (
             <div className="flex items-center gap-1.5 text-xs text-amber-300 mt-1 truncate">
               <AlertCircle className="w-3 h-3 shrink-0" />
               <span>Last Sighted: {data.date.replace('T', ' ')}</span>
             </div>
           )}
        </div>

        {/* Source: Truncated to 2 lines */}
        {data.evidenceSource && (
          <div className="flex items-start gap-1.5 text-[10px] text-slate-500 mt-1 pt-2 border-t border-slate-800/50 shrink-0">
            <FileText className="w-3 h-3 mt-0.5 shrink-0" />
            <span className="italic line-clamp-2" title={data.evidenceSource}>{data.evidenceSource}</span>
          </div>
        )}
      </div>
    </BaseNodeWrapper>
  );
});

// --- CUSTOM EDGE COMPONENT ---
export const DeletableEdge = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  label
}: EdgeProps) => {
  const { setEdges } = useReactFlow();
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const onEdgeClick = (evt: React.MouseEvent) => {
    evt.stopPropagation(); // Prevents selecting the edge when clicking delete
    setEdges((edges) => edges.filter((e) => e.id !== id));
  };

  return (
    <>
      <BaseEdge path={edgePath} markerEnd={markerEnd} style={style} />
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            fontSize: 12,
            pointerEvents: 'all',
          }}
          className="nodrag nopan flex flex-col items-center gap-1 group"
        >
          {/* Show Label if exists */}
          {label && (
            <div className="bg-slate-900/80 text-slate-300 text-[10px] px-2 py-0.5 rounded border border-slate-700 backdrop-blur-sm whitespace-nowrap shadow-sm">
              {label as string}
            </div>
          )}
          
          {/* Delete Button */}
          <button
            className="w-5 h-5 bg-slate-900 border border-slate-600 rounded-full text-slate-400 hover:text-white hover:bg-red-600 hover:border-red-600 flex items-center justify-center transition-all shadow-md z-50 active:scale-95"
            onClick={onEdgeClick}
            title="Unlink (Delete Connection)"
            aria-label="Unlink"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      </EdgeLabelRenderer>
    </>
  );
};