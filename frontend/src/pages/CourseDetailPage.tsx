import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ChevronLeft, PlayCircle, FileText, Download, Sparkles, Clock, User, BarChart, Lock, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { apiFetch } from '../utils/api';

interface ModuleItem {
  _id: string;
  title: string;
  description?: string;
  videoUrl?: string;
  notesUrl?: string;
  duration?: string;
  order: number;
}

export default function CourseDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [course, setCourse] = useState<any>(null);
  const [modules, setModules] = useState<ModuleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [enrolling, setEnrolling] = useState(false);
  const [activeVideo, setActiveVideo] = useState<string | null>(null);
  const [activeTitle, setActiveTitle] = useState('');

  useEffect(() => {
    const fetchCourse = async () => {
      try {
        const courseData = await apiFetch(`/courses/${id}`);
        const c = courseData.course || courseData;
        setCourse(c);
        setIsEnrolled(!!c.isEnrolled);
        if (c.isEnrolled) {
          const modulesData = await apiFetch(`/courses/${id}/modules`);
          const mods = modulesData.modules || [];
          setModules(mods);
          const firstVideo = mods.find((m: ModuleItem) => m.videoUrl);
          if (firstVideo) {
            setActiveVideo(firstVideo.videoUrl!);
            setActiveTitle(firstVideo.title);
          }
        }
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    fetchCourse();
  }, [id]);

  const handleEnroll = async () => {
    setEnrolling(true);
    try {
      await apiFetch(`/courses/${id}/enroll`, { method: 'POST' });
      setIsEnrolled(true);
      // Reload to fetch modules
      const modulesData = await apiFetch(`/courses/${id}/modules`);
      const mods = modulesData.modules || [];
      setModules(mods);
      const firstVideo = mods.find((m: ModuleItem) => m.videoUrl);
      if (firstVideo) { setActiveVideo(firstVideo.videoUrl!); setActiveTitle(firstVideo.title); }
    } catch (err: any) {
      alert(err.message || 'Enrollment failed');
    } finally {
      setEnrolling(false);
    }
  };

  const handlePlayVideo = (mod: ModuleItem) => {
    if (mod.videoUrl) { setActiveVideo(mod.videoUrl); setActiveTitle(mod.title); }
  };

  const handleDownloadNotes = (mod: ModuleItem) => {
    if (mod.notesUrl) {
      window.open(mod.notesUrl.startsWith('/') ? mod.notesUrl : `/${mod.notesUrl}`, '_blank');
    }
  };

  if (loading) return <div className="text-center py-20 text-slate-400 font-medium">Loading course...</div>;
  if (!course) return <div className="text-center py-20 text-slate-400 font-medium">Course not found</div>;

  return (
    <div className="max-w-7xl mx-auto space-y-10">
      <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
        <Link to="/courses" className="inline-flex items-center gap-2 text-slate-400 hover:text-brand-purple font-bold text-sm transition-all group">
          <div className="w-8 h-8 bg-white/5 rounded-lg flex items-center justify-center group-hover:bg-brand-purple/10 transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </div>
          Back to Courses
        </Link>
      </motion.div>

      <div className="grid lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2 space-y-8">
          {/* Video Player / Lock Overlay */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="aspect-video glass-panel rounded-[3rem] overflow-hidden border-white/5 relative group shadow-2xl glow-shadow"
          >
            {isEnrolled && activeVideo ? (
              <video
                key={activeVideo}
                src={activeVideo.startsWith('http') ? activeVideo : activeVideo.startsWith('/') ? activeVideo : `/${activeVideo}`}
                controls
                autoPlay
                className="w-full h-full object-contain bg-black"
              />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-brand-purple/10 to-brand-blue/10 flex flex-col items-center justify-center gap-6">
                <div className="w-24 h-24 bg-white/5 rounded-[2rem] flex items-center justify-center border border-white/10">
                  <Lock className="w-12 h-12 text-slate-500" />
                </div>
                {!isEnrolled ? (
                  <>
                    <p className="text-slate-400 font-bold text-lg">Enroll to unlock course content</p>
                    <button
                      onClick={handleEnroll}
                      disabled={enrolling}
                      className="px-10 py-4 bg-gradient-to-r from-brand-purple to-brand-blue text-white rounded-2xl font-bold text-sm hover:scale-105 transition-all shadow-lg glow-shadow disabled:opacity-60"
                    >
                      {enrolling ? 'Enrolling...' : '🎓 Enroll Now — Free'}
                    </button>
                  </>
                ) : (
                  <p className="text-slate-400 font-medium">Select a lesson to start watching</p>
                )}
              </div>
            )}
            {isEnrolled && activeTitle && (
              <div className="absolute bottom-0 left-0 right-0 p-8 bg-gradient-to-t from-black/90 via-black/40 to-transparent z-10 pointer-events-none">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="w-4 h-4 text-brand-purple" />
                  <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-brand-purple">Now Playing</span>
                </div>
                <h2 className="text-2xl font-bold text-white tracking-tight">{activeTitle}</h2>
              </div>
            )}
          </motion.div>

          {/* Course Info */}
          <div className="glass-panel p-10 rounded-[3rem] border-white/5">
            <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
              <h1 className="text-4xl font-bold text-white tracking-tight">{course.title}</h1>
              {isEnrolled && (
                <span className="flex items-center gap-2 px-5 py-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full text-sm font-bold">
                  <CheckCircle2 className="w-4 h-4" /> Enrolled
                </span>
              )}
            </div>
            <p className="text-slate-400 leading-relaxed mb-10 text-lg font-medium">{course.description || 'No description available.'}</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div className="p-5 bg-white/5 rounded-3xl border border-white/5 flex items-center gap-4">
                <div className="w-12 h-12 bg-brand-purple/10 rounded-2xl flex items-center justify-center"><User className="w-6 h-6 text-brand-purple" /></div>
                <div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Instructor</p>
                  <p className="text-sm font-bold text-white mt-1">{course.instructor}</p>
                </div>
              </div>
              <div className="p-5 bg-white/5 rounded-3xl border border-white/5 flex items-center gap-4">
                <div className="w-12 h-12 bg-brand-blue/10 rounded-2xl flex items-center justify-center"><BarChart className="w-6 h-6 text-brand-blue" /></div>
                <div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Level</p>
                  <p className="text-sm font-bold text-white mt-1">{course.level || 'All Levels'}</p>
                </div>
              </div>
              <div className="p-5 bg-white/5 rounded-3xl border border-white/5 flex items-center gap-4">
                <div className="w-12 h-12 bg-emerald-400/10 rounded-2xl flex items-center justify-center"><Clock className="w-6 h-6 text-emerald-400" /></div>
                <div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Lessons</p>
                  <p className="text-sm font-bold text-white mt-1">{modules.length} Lessons</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Lesson Sidebar */}
        <div className="space-y-8">
          <div className="glass-panel rounded-[3rem] border-white/5 overflow-hidden">
            <div className="p-8 border-b border-white/5">
              <h3 className="text-xl font-bold text-white tracking-tight">Course Content</h3>
              <p className="text-xs text-slate-500 font-medium mt-2">
                {isEnrolled ? `${modules.length} lesson${modules.length !== 1 ? 's' : ''}` : 'Enroll to access lessons'}
              </p>
            </div>
            <div className="p-4 space-y-2 max-h-[600px] overflow-y-auto custom-scrollbar">
              {!isEnrolled ? (
                <div className="text-center py-10 flex flex-col items-center gap-4">
                  <Lock className="w-10 h-10 text-slate-600" />
                  <p className="text-slate-500 text-sm font-medium">Enroll to unlock all lessons</p>
                  <button
                    onClick={handleEnroll}
                    disabled={enrolling}
                    className="px-8 py-3 bg-gradient-to-r from-brand-purple to-brand-blue text-white rounded-2xl text-sm font-bold hover:scale-105 transition-all disabled:opacity-60"
                  >
                    {enrolling ? 'Enrolling...' : 'Enroll Now'}
                  </button>
                </div>
              ) : modules.length === 0 ? (
                <p className="text-slate-500 text-center py-10 text-sm">No lessons added yet.</p>
              ) : modules.map((mod, i) => (
                <button
                  key={mod._id}
                  onClick={() => handlePlayVideo(mod)}
                  className={`w-full flex items-center justify-between p-4 rounded-2xl text-left transition-all border group ${
                    activeTitle === mod.title ? 'bg-white/10 border-brand-purple/30' : 'border-transparent hover:bg-white/10 hover:border-white/10'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                      activeTitle === mod.title ? 'bg-brand-purple/20 text-brand-purple' : 'bg-white/5 text-slate-500 group-hover:text-brand-purple group-hover:scale-110'
                    }`}>
                      {mod.videoUrl ? <PlayCircle className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
                    </div>
                    <div>
                      <p className={`text-sm font-bold ${activeTitle === mod.title ? 'text-brand-purple' : 'text-white'}`}>{mod.title}</p>
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">{mod.duration || `Lesson ${i + 1}`}</p>
                    </div>
                  </div>
                  {mod.notesUrl && (
                    <button onClick={(e) => { e.stopPropagation(); handleDownloadNotes(mod); }}
                      className="p-2 bg-white/5 rounded-lg text-slate-400 hover:text-brand-blue transition-colors" title="Download PDF Notes">
                      <Download className="w-4 h-4" />
                    </button>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
