import React, { useState, useEffect } from 'react';
import { Calendar, User, GripVertical, MapPin, FileSearch, Building2, Activity, Wifi, ShieldCheck, StickyNote, LogOut } from 'lucide-react';
import { NodeType } from '../types';

interface SidebarProps {
  onLogout: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ onLogout }) => {
  const [systemTime, setSystemTime] = useState(new Date().toLocaleTimeString());

  useEffect(() => {
    const interval = setInterval(() => {
      setSystemTime(new Date().toLocaleTimeString());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const onDragStart = (event: React.DragEvent, type: string) => {
    event.dataTransfer.setData('application/reactflow', type);
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col z-10 shadow-2xl">
      {/* Header */}
      <div className="p-4 border-b border-slate-800 bg-slate-900/50 backdrop-blur">
        <h1 className="text-lg font-bold text-slate-100 tracking-tight flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse shadow-[0_0_10px_rgba(245,158,11,0.5)]" />
          <span className="text-amber-500">INTEL</span>BOARD
        </h1>
        <div className="flex justify-between items-center mt-1">
          <p className="text-[10px] text-slate-500 font-mono">UNIT: OMEGA-9</p>
          <p className="text-[10px] text-slate-600 font-mono">{systemTime}</p>
        </div>
      </div>
      
      {/* Assets List */}
      <div className="p-4 flex flex-col gap-3 overflow-y-auto flex-1">
        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 flex items-center gap-2">
          Core Entities
          <div className="h-px flex-1 bg-slate-800" />
        </div>
        
        <div 
          id="sidebar-item-event"
          className="flex items-center gap-3 p-3 bg-slate-800/50 rounded border border-slate-700/50 cursor-grab hover:bg-slate-800 hover:border-blue-500/50 transition-all group active:scale-95"
          onDragStart={(event) => onDragStart(event, NodeType.EVENT)}
          draggable
        >
          <GripVertical className="w-4 h-4 text-slate-600 group-hover:text-slate-400" />
          <div className="w-8 h-8 rounded bg-blue-500/10 flex items-center justify-center text-blue-400 border border-blue-500/20">
            <Calendar className="w-4 h-4" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-medium text-slate-200">Event</span>
            <span className="text-[10px] text-slate-500">Timeline node</span>
          </div>
        </div>

        <div 
          id="sidebar-item-person"
          className="flex items-center gap-3 p-3 bg-slate-800/50 rounded border border-slate-700/50 cursor-grab hover:bg-slate-800 hover:border-amber-500/50 transition-all group active:scale-95"
          onDragStart={(event) => onDragStart(event, NodeType.PERSON)}
          draggable
        >
          <GripVertical className="w-4 h-4 text-slate-600 group-hover:text-slate-400" />
          <div className="w-8 h-8 rounded bg-amber-500/10 flex items-center justify-center text-amber-400 border border-amber-500/20">
            <User className="w-4 h-4" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-medium text-slate-200">Person</span>
            <span className="text-[10px] text-slate-500">Subject/Witness</span>
          </div>
        </div>

        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 mt-4 flex items-center gap-2">
          Intelligence
          <div className="h-px flex-1 bg-slate-800" />
        </div>

        <div 
          id="sidebar-item-location"
          className="flex items-center gap-3 p-3 bg-slate-800/50 rounded border border-slate-700/50 cursor-grab hover:bg-slate-800 hover:border-emerald-500/50 transition-all group active:scale-95"
          onDragStart={(event) => onDragStart(event, 'location')}
          draggable
        >
          <GripVertical className="w-4 h-4 text-slate-600 group-hover:text-slate-400" />
          <div className="w-8 h-8 rounded bg-emerald-500/10 flex items-center justify-center text-emerald-400 border border-emerald-500/20">
            <MapPin className="w-4 h-4" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-medium text-slate-200">Location</span>
            <span className="text-[10px] text-slate-500">Scene / Site</span>
          </div>
        </div>

        <div 
          id="sidebar-item-evidence"
          className="flex items-center gap-3 p-3 bg-slate-800/50 rounded border border-slate-700/50 cursor-grab hover:bg-slate-800 hover:border-purple-500/50 transition-all group active:scale-95"
          onDragStart={(event) => onDragStart(event, 'evidence')}
          draggable
        >
          <GripVertical className="w-4 h-4 text-slate-600 group-hover:text-slate-400" />
          <div className="w-8 h-8 rounded bg-purple-500/10 flex items-center justify-center text-purple-400 border border-purple-500/20">
            <FileSearch className="w-4 h-4" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-medium text-slate-200">Evidence</span>
            <span className="text-[10px] text-slate-500">Digital / Physical</span>
          </div>
        </div>

        <div 
          id="sidebar-item-org"
          className="flex items-center gap-3 p-3 bg-slate-800/50 rounded border border-slate-700/50 cursor-grab hover:bg-slate-800 hover:border-slate-500/50 transition-all group active:scale-95"
          onDragStart={(event) => onDragStart(event, 'organization')}
          draggable
        >
          <GripVertical className="w-4 h-4 text-slate-600 group-hover:text-slate-400" />
          <div className="w-8 h-8 rounded bg-slate-700/50 flex items-center justify-center text-slate-300 border border-slate-600/30">
            <Building2 className="w-4 h-4" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-medium text-slate-200">Organization</span>
            <span className="text-[10px] text-slate-500">Group / Corp</span>
          </div>
        </div>

        <div 
          id="sidebar-item-note"
          className="flex items-center gap-3 p-3 bg-slate-800/50 rounded border border-slate-700/50 cursor-grab hover:bg-slate-800 hover:border-yellow-500/50 transition-all group active:scale-95"
          onDragStart={(event) => onDragStart(event, NodeType.NOTE)}
          draggable
        >
          <GripVertical className="w-4 h-4 text-slate-600 group-hover:text-slate-400" />
          <div className="w-8 h-8 rounded bg-yellow-500/10 flex items-center justify-center text-yellow-400 border border-yellow-500/20">
            <StickyNote className="w-4 h-4" />
          </div>
          <span className="text-sm font-medium text-slate-200">Sticky Note</span>
        </div>
      </div>

      {/* System Status Footer */}
      <div className="mt-auto bg-slate-950 border-t border-slate-800 p-4">
        <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 mb-3 tracking-widest">
          SYSTEM STATUS
          <span className="flex h-1.5 w-1.5 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
          </span>
        </div>
        
        <div className="space-y-2 font-mono text-[10px]">
          <div className="flex items-center justify-between text-slate-400">
            <span className="flex items-center gap-2">
              <Wifi className="w-3 h-3 text-emerald-500" /> NETWORK
            </span>
            <span className="text-emerald-500">SECURE</span>
          </div>
          <div className="flex items-center justify-between text-slate-400">
            <span className="flex items-center gap-2">
              <Activity className="w-3 h-3 text-blue-500" /> ANALYTICS
            </span>
            <span className="text-blue-500">READY</span>
          </div>
          <div className="flex items-center justify-between text-slate-400">
            <span className="flex items-center gap-2">
              <ShieldCheck className="w-3 h-3 text-amber-500" /> PROTOCOL
            </span>
            <span className="text-amber-500">V1.2 Active</span>
          </div>
        </div>
        
        <div className="mt-3 pt-2 border-t border-slate-900 text-[10px] text-slate-600 text-center mb-2">
          Encrypted Connection • Top Secret Clearance
        </div>

        <button 
          onClick={onLogout}
          className="mt-4 w-full flex items-center justify-center gap-2 py-2 rounded bg-slate-800 hover:bg-red-900/30 border border-slate-700 hover:border-red-500/30 text-slate-400 hover:text-red-400 text-xs font-medium transition-colors group"
        >
          <LogOut className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
          DISCONNECT SESSION
        </button>
      </div>
    </aside>
  );
};