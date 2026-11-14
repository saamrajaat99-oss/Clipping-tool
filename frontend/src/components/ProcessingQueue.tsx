import React from 'react';
import { 
  ListOrdered, 
  Play, 
  Pause, 
  RotateCcw, 
  XCircle, 
  Trash2, 
  Loader2, 
  CheckCircle2, 
  AlertCircle,
  Clock,
  Sparkles
} from 'lucide-react';
import { Task } from '../types';
import { api } from '../services/api';

interface ProcessingQueueProps {
  tasks: Task[];
  isPaused: boolean;
  onRefresh: () => void;
}

export const ProcessingQueue: React.FC<ProcessingQueueProps> = ({
  tasks,
  isPaused,
  onRefresh
}) => {
  const handlePauseToggle = async () => {
    try {
      if (isPaused) {
        await api.resumeQueue();
      } else {
        await api.pauseQueue();
      }
      onRefresh();
    } catch (err: any) {
      alert(`Queue control error: ${err.message}`);
    }
  };

  const handleRetry = async (taskId: string) => {
    try {
      await api.retryTask(taskId);
      onRefresh();
    } catch (err: any) {
      alert(`Retry failed: ${err.message}`);
    }
  };

  const handleCancel = async (taskId: string) => {
    try {
      await api.cancelTask(taskId);
      onRefresh();
    } catch (err: any) {
      alert(`Cancel failed: ${err.message}`);
    }
  };

  const handleClearCompleted = async () => {
    try {
      await api.clearCompletedQueue();
      onRefresh();
    } catch (err: any) {
      alert(`Clear failed: ${err.message}`);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'downloading':
      case 'analyzing':
      case 'generating':
      case 'processing':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-1.5 animate-pulse">
            <Loader2 className="w-3 h-3 animate-spin" />
            <span className="capitalize">{status}</span>
          </span>
        );
      case 'completed':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5">
            <CheckCircle2 className="w-3 h-3" />
            <span>Completed</span>
          </span>
        );
      case 'failed':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center gap-1.5">
            <AlertCircle className="w-3 h-3" />
            <span>Failed</span>
          </span>
        );
      case 'cancelled':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-800 text-slate-400">
            Cancelled
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center gap-1.5">
            <Clock className="w-3 h-3" />
            <span>Pending</span>
          </span>
        );
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      {/* Header with Queue Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <ListOrdered className="w-6 h-6 text-indigo-400" />
            <span>Persistent Background Queue</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Tasks process sequentially in the background on your RTX 4060 GPU and automatically recover after laptop restarts.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handlePauseToggle}
            className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all ${
              isPaused
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/30'
                : 'bg-amber-600 hover:bg-amber-500 text-white shadow-md shadow-amber-600/30'
            }`}
          >
            {isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
            <span>{isPaused ? 'Resume Queue' : 'Pause Queue'}</span>
          </button>

          <button
            onClick={handleClearCompleted}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5 border border-slate-700 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear History</span>
          </button>
        </div>
      </div>

      {/* Task List */}
      <div className="space-y-4">
        {tasks.length > 0 ? (
          tasks.map((task) => (
            <div
              key={task.id}
              className="p-5 rounded-2xl bg-[#12141d]/90 border border-slate-800/80 space-y-4 hover:border-slate-700 transition-all shadow-sm"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-white">
                      {task.video_title || 'Video Processing Pipeline'}
                    </span>
                    {getStatusBadge(task.status)}
                  </div>
                  <div className="text-xs text-slate-400 font-mono">
                    ID: {task.id.slice(0, 8)}... • Queued: {new Date(task.created_at).toLocaleTimeString()}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {task.status === 'failed' && (
                    <button
                      onClick={() => handleRetry(task.id)}
                      className="px-3 py-1.5 rounded-lg bg-indigo-600/20 text-indigo-300 hover:bg-indigo-600 hover:text-white border border-indigo-500/30 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Retry</span>
                    </button>
                  )}

                  {['pending', 'downloading', 'analyzing', 'generating', 'processing'].includes(task.status) && (
                    <button
                      onClick={() => handleCancel(task.id)}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-rose-950 text-slate-400 hover:text-rose-400 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                    >
                      <XCircle className="w-3 h-3" />
                      <span>Cancel</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Progress Bar & Status Text */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-300 font-medium">{task.status_message || 'In queue...'}</span>
                  <span className="font-mono font-bold text-indigo-400">{Math.round(task.progress)}%</span>
                </div>
                <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      task.status === 'failed'
                        ? 'bg-rose-500'
                        : task.status === 'completed'
                        ? 'bg-emerald-500'
                        : 'bg-gradient-to-r from-indigo-500 via-indigo-400 to-cyan-400'
                    }`}
                    style={{ width: `${task.progress}%` }}
                  />
                </div>
              </div>

              {task.error_message && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs font-mono">
                  {task.error_message}
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="p-16 text-center border border-dashed border-slate-800 rounded-2xl text-slate-500 text-sm">
            Processing queue is empty. Import videos to add tasks.
          </div>
        )}
      </div>
    </div>
  );
};
