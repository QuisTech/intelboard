import React from 'react';
import { KidnappingAnalysis } from '../services/kidnappingAnalysis';
import { 
  AlertTriangle, 
  Shield, 
  MapPin, 
  Clock, 
  Phone, 
  Users,
  Car,
  Radio,
  Plane,
  Satellite
} from 'lucide-react';

interface KidnappingDashboardProps {
  analysis: KidnappingAnalysis;
  onAction: (action: string) => void;
}

export const KidnappingDashboard: React.FC<KidnappingDashboardProps> = ({ analysis, onAction }) => {
  return (
    <div className="absolute top-4 left-4 w-96 bg-slate-900/95 border border-red-500/30 rounded-xl shadow-2xl p-4 z-40 animate-slide-in-right">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-6 h-6 text-red-500" />
          <h2 className="text-xl font-bold text-slate-200">KIDNAP RESPONSE</h2>
        </div>
        <div className={`px-3 py-1 rounded-full text-sm font-bold ${
          analysis.riskAssessment.victimVulnerability === 'HIGH' 
            ? 'bg-red-500/20 text-red-300 border border-red-500/40'
            : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
        }`}>
          {analysis.riskAssessment.victimVulnerability} RISK
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        <button 
          onClick={() => onAction('activate_irt')}
          className="p-2 bg-red-600 hover:bg-red-700 rounded text-sm font-medium flex items-center justify-center gap-2 transition-colors"
        >
          <Shield className="w-4 h-4" /> Activate IRT
        </button>
        <button 
          onClick={() => onAction('track_phones')}
          className="p-2 bg-blue-600 hover:bg-blue-700 rounded text-sm font-medium flex items-center justify-center gap-2 transition-colors"
        >
          <Satellite className="w-4 h-4" /> Track Phones
        </button>
        <button 
          onClick={() => onAction('setup_roadblocks')}
          className="p-2 bg-amber-600 hover:bg-amber-700 rounded text-sm font-medium flex items-center justify-center gap-2 transition-colors"
        >
          <Car className="w-4 h-4" /> Roadblocks
        </button>
        <button 
          onClick={() => onAction('contact_family')}
          className="p-2 bg-green-600 hover:bg-green-700 rounded text-sm font-medium flex items-center justify-center gap-2 transition-colors"
        >
          <Phone className="w-4 h-4" /> Family Contact
        </button>
      </div>

      {/* Critical Information */}
      <div className="space-y-3">
        {/* Response Time */}
        <div className="flex items-center gap-3 p-2 bg-slate-800/50 rounded">
          <Clock className="w-5 h-5 text-blue-400" />
          <div>
            <div className="text-sm text-slate-400">Response Window</div>
            <div className="font-semibold text-slate-200">
              {analysis.riskAssessment.estimatedResponseTime}
            </div>
          </div>
        </div>

        {/* Hotspot Zones */}
        <div className="p-2 bg-slate-800/50 rounded">
          <div className="flex items-center gap-2 mb-2">
            <MapPin className="w-5 h-5 text-red-400" />
            <div className="font-medium text-slate-200">High-Risk Zones</div>
          </div>
          <div className="flex flex-wrap gap-1">
            {analysis.geographicalAnalysis.hotspotZones.map((zone, idx) => (
              <span key={idx} className="px-2 py-1 bg-red-500/20 text-red-300 rounded text-xs">
                {zone}
              </span>
            ))}
            {analysis.geographicalAnalysis.hotspotZones.length === 0 && (
              <span className="text-xs text-slate-500">No known hotspots detected</span>
            )}
          </div>
        </div>

        {/* Required Units */}
        <div className="p-2 bg-slate-800/50 rounded">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-5 h-5 text-green-400" />
            <div className="font-medium text-slate-200">Required Units</div>
          </div>
          <div className="space-y-1">
            {analysis.resourceAllocation.recommendedUnits.map((unit, idx) => (
              <div key={idx} className="flex items-center gap-2 text-sm">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <span className="text-slate-300">{unit}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Negotiation Status */}
        <div className="p-2 bg-slate-800/50 rounded">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Radio className="w-5 h-5 text-purple-400" />
              <div className="font-medium text-slate-200">Negotiation</div>
            </div>
            <div className={`px-2 py-1 rounded text-xs font-bold ${
              analysis.negotiationStrategy.approach === 'SOFT'
                ? 'bg-purple-500/30 text-purple-300'
                : analysis.negotiationStrategy.approach === 'HARD'
                ? 'bg-red-500/30 text-red-300'
                : 'bg-amber-500/30 text-amber-300'
            }`}>
              {analysis.negotiationStrategy.approach}
            </div>
          </div>
          <div className="text-sm text-slate-400">
            {analysis.negotiationStrategy.recommendedActions[0]}
          </div>
        </div>

        {/* Next Contact */}
        <div className="p-2 bg-slate-800/50 rounded">
          <div className="flex items-center gap-2 mb-1">
            <Phone className="w-5 h-5 text-amber-400" />
            <div className="font-medium text-slate-200">Next Contact Expected</div>
          </div>
          <div className="text-sm text-amber-300">
            {new Date(analysis.timelineAnalysis.nextLikelyContact).toLocaleString('en-NG', {
              hour: '2-digit',
              minute: '2-digit',
              day: 'numeric',
              month: 'short'
            })}
          </div>
        </div>

        {/* Special Equipment */}
        {analysis.resourceAllocation.airSupport && (
          <div className="p-2 bg-blue-900/30 border border-blue-500/30 rounded">
            <div className="flex items-center gap-2">
              <Plane className="w-5 h-5 text-blue-400" />
              <div className="font-medium text-slate-200">Special Request</div>
            </div>
            <div className="text-sm text-blue-300 mt-1">
              Air surveillance required - Contact Nigerian Air Force
            </div>
          </div>
        )}
      </div>

      {/* Tactical Suggestions */}
      <div className="mt-4 pt-4 border-t border-slate-700">
        <h3 className="font-bold text-slate-200 mb-2">Immediate Actions</h3>
        <ul className="space-y-2">
          {analysis.tacticalSuggestions.slice(0, 3).map((suggestion, idx) => (
            <li key={idx} className="flex items-start gap-2 text-sm">
              <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5" />
              <span className="text-slate-300">{suggestion}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};