import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Calendar, 
  Trash2, 
  Edit3, 
  ExternalLink, 
  MoreVertical,
  ChevronRight,
  Clock,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  deleteDoc, 
  doc, 
  updateDoc 
} from 'firebase/firestore';
import { useAuth } from '../lib/AuthContext';
import { cn } from '../lib/utils';

interface HistoryRecord {
  id: string;
  userId: string;
  name: string;
  imageBase64: string;
  landmarks: any[];
  analysisResult: any;
  createdAt: any;
}

interface HistoryViewProps {
  onSelect: (record: HistoryRecord) => void;
}

export default function HistoryView({ onSelect }: HistoryViewProps) {
  const { user } = useAuth();
  const [records, setRecords] = useState<HistoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'analyses'),
      where('userId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as HistoryRecord[];
      
      // Sort client-side by createdAt desc
      docs.sort((a, b) => {
        const timeA = a.createdAt?.toMillis() || 0;
        const timeB = b.createdAt?.toMillis() || 0;
        return timeB - timeA;
      });

      setRecords(docs);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'analyses');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    
    try {
      await deleteDoc(doc(db, 'analyses', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `analyses/${id}`);
    }
  };

  const startEditing = (e: React.MouseEvent, record: HistoryRecord) => {
    e.stopPropagation();
    setEditingId(record.id);
    setEditName(record.name || 'Untitled Analysis');
  };

  const saveName = async (e: React.FormEvent, id: string) => {
    e.preventDefault();
    if (!editName.trim()) return;

    try {
      await updateDoc(doc(db, 'analyses', id), {
        name: editName.trim()
      });
      setEditingId(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `analyses/${id}`);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Records Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        <AnimatePresence mode="popLayout">
          {records.map((record) => (
            <motion.div
              key={record.id}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              onClick={() => onSelect(record)}
              className="group bg-white rounded-3xl border border-gray-100 shadow-sm hover:shadow-xl hover:border-blue-100 transition-all cursor-pointer overflow-hidden flex flex-col"
            >
              {/* Image Preview */}
              <div className="aspect-[4/3] relative overflow-hidden bg-gray-100">
                <img 
                  src={record.imageBase64} 
                  alt={record.name} 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                  <span className="text-white text-xs font-bold flex items-center gap-2">
                    View Full Report <ChevronRight className="w-3 h-3" />
                  </span>
                </div>
                <div className="absolute top-3 right-3 flex gap-2">
                  <button 
                    onClick={(e) => startEditing(e, record)}
                    className="p-2 bg-white/90 backdrop-blur-sm text-gray-600 hover:text-blue-600 rounded-xl shadow-sm transition-all opacity-0 group-hover:opacity-100"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={(e) => handleDelete(e, record.id)}
                    className="p-2 bg-white/90 backdrop-blur-sm text-gray-600 hover:text-red-600 rounded-xl shadow-sm transition-all opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="p-5 flex-1 flex flex-col">
                {editingId === record.id ? (
                  <form 
                    onSubmit={(e) => saveName(e, record.id)}
                    className="mb-3"
                    onClick={e => e.stopPropagation()}
                  >
                    <input 
                      autoFocus
                      type="text"
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      onBlur={(e) => saveName(e as any, record.id)}
                      className="w-full px-3 py-2 bg-blue-50 border border-blue-200 rounded-xl text-sm font-bold focus:outline-none"
                    />
                  </form>
                ) : (
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors truncate">
                      {record.name || 'Untitled Analysis'}
                    </h3>
                  </div>
                )}

                <div className="flex items-center gap-4 mt-auto">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                    <Calendar className="w-3 h-3" />
                    {record.createdAt?.toDate().toLocaleDateString()}
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-blue-500 uppercase tracking-widest">
                    <CheckCircle2 className="w-3 h-3" />
                    Score: {record.analysisResult?.overallScore || 'N/A'}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {records.length === 0 && (
          <div className="col-span-full py-20 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 bg-gray-50 rounded-3xl flex items-center justify-center text-gray-300 mb-4">
              <Clock className="w-8 h-8" />
            </div>
            <h3 className="font-bold text-gray-900 mb-1">No reports found</h3>
            <p className="text-sm text-gray-500">
              Start your first analysis to see it here.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
