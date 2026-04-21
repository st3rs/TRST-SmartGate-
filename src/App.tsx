import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Users, 
  Dog, 
  Cat,
  Zap, 
  Home, 
  Shield, 
  Bell, 
  Search, 
  Menu, 
  X, 
  Car, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Package, 
  Smartphone,
  ChevronRight,
  LogOut,
  Settings,
  HelpCircle,
  Map as MapIcon,
  Layers,
  Camera,
  MapPin,
  Sparkles,
  ExternalLink,
  Loader2,
  Trash2,
  RotateCcw,
  Maximize2,
  Play,
  QrCode,
  Calendar,
  UserPlus
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI } from "@google/genai";
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  AreaChart, 
  Area 
} from 'recharts';
import { cn } from './lib/utils';

// --- Types ---
type View = 'dashboard' | 'visitors' | 'pets' | 'utilities' | 'smarthome' | 'security';

interface Visitor {
  id: string;
  plate: string;
  unit: string;
  entryTime: string;
  status: 'active' | 'overstay' | 'exited';
  type: 'guest' | 'delivery' | 'service';
}

interface PetAlert {
  id: string;
  type: 'dog' | 'cat';
  breed: string;
  lastSeen: string;
  location: string;
  status: 'missing' | 'spotted';
  image: string;
  x: number; // 0-100 percentage
  y: number; // 0-100 percentage
}

// --- Mock Data ---
const MOCK_VISITORS: Visitor[] = [
  { id: '1', plate: 'กข 1234', unit: 'A12', entryTime: '08:30 AM', status: 'active', type: 'guest' },
  { id: '2', plate: 'ขค 5678', unit: 'B05', entryTime: '09:15 AM', status: 'active', type: 'delivery' },
  { id: '3', plate: 'งจ 9012', unit: 'C22', entryTime: 'เมื่อวาน', status: 'overstay', type: 'guest' },
  { id: '4', plate: 'ชซ 3456', unit: 'D01', entryTime: '10:00 AM', status: 'active', type: 'service' },
];

const MOCK_PETS: PetAlert[] = [
  { id: '1', type: 'dog', breed: 'โกลเด้น รีทรีฟเวอร์', lastSeen: '10 นาทีที่แล้ว', location: 'สวนสาธารณะ โซน A', status: 'spotted', image: 'https://picsum.photos/seed/dog1/200/200', x: 35, y: 45 },
  { id: '2', type: 'cat', breed: 'เปอร์เซีย', lastSeen: '2 ชั่วโมงที่แล้ว', location: 'ซอย 5', status: 'missing', image: 'https://picsum.photos/seed/cat1/200/200', x: 65, y: 25 },
  { id: '3', type: 'dog', breed: 'บีเกิล', lastSeen: 'เมื่อสักครู่', location: 'ประตูทางเข้าหลัก', status: 'spotted', image: 'https://picsum.photos/seed/dog2/200/200', x: 15, y: 80 },
];

const ALERT_ZONES = [
  { id: 'z1', name: 'ประตูทางเข้าหลัก', x: 10, y: 70, w: 20, h: 20, type: 'danger', color: '#f43f5e' },
  { id: 'z2', name: 'สวนส่วนกลาง', x: 30, y: 30, w: 30, h: 30, type: 'safe', color: '#10b981' },
  { id: 'z3', name: 'เขตก่อสร้าง', x: 70, y: 60, w: 20, h: 25, type: 'danger', color: '#f59e0b' },
];

const CAMERA_POINTS = [
  { id: 'c1', x: 15, y: 75, name: 'CAM-01: ประตูหลัก' },
  { id: 'c2', x: 45, y: 45, name: 'CAM-02: สวนกลาง' },
  { id: 'c3', x: 85, y: 25, name: 'CAM-03: ซอย 5' },
  { id: 'c4', x: 75, y: 70, name: 'CAM-04: เขตก่อสร้าง' },
];

const UTILITY_DATA = [
  { name: 'จ.', usage: 45 },
  { name: 'อ.', usage: 52 },
  { name: 'พ.', usage: 48 },
  { name: 'พฤ.', usage: 61 },
  { name: 'ศ.', usage: 55 },
  { name: 'ส.', usage: 67 },
  { name: 'อา.', usage: 60 },
];

// --- AI Service ---
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

const getNeighborhoodInfo = async (query: string, lat?: number, lng?: number) => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: query,
      config: {
        tools: [{ googleMaps: {} }],
        toolConfig: {
          retrievalConfig: {
            latLng: lat && lng ? { latitude: lat, longitude: lng } : undefined
          }
        }
      },
    });

    return {
      text: response.text,
      links: response.candidates?.[0]?.groundingMetadata?.groundingChunks
        ?.map((chunk: any) => chunk.maps)
        .filter(Boolean) || []
    };
  } catch (error) {
    console.error("Gemini Error:", error);
    throw error;
  }
};

// --- Components ---
const ConfirmationDialog = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  message 
}: { 
  isOpen: boolean, 
  onClose: () => void, 
  onConfirm: () => void, 
  title: string, 
  message: string 
}) => (
  <AnimatePresence>
    {isOpen && (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
        />
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl p-8 overflow-hidden"
        >
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-rose-500" />
            </div>
            <h3 className="text-xl font-bold text-slate-900">{title}</h3>
          </div>
          <p className="text-slate-600 mb-8 leading-relaxed">{message}</p>
          <div className="flex gap-3">
            <button 
              onClick={onClose}
              className="flex-1 px-6 py-3 rounded-2xl bg-slate-100 text-slate-600 font-bold hover:bg-slate-200 transition-colors"
            >
              ยกเลิก
            </button>
            <button 
              onClick={() => {
                onConfirm();
                onClose();
              }}
              className="flex-1 px-6 py-3 rounded-2xl bg-rose-500 text-white font-bold hover:bg-rose-600 transition-colors shadow-lg shadow-rose-200"
            >
              ยืนยันการลบ
            </button>
          </div>
        </motion.div>
      </div>
    )}
  </AnimatePresence>
);

const CameraFeedModal = ({ 
  isOpen, 
  onClose, 
  cameraName, 
  cameraId 
}: { 
  isOpen: boolean, 
  onClose: () => void, 
  cameraName: string, 
  cameraId: number 
}) => (
  <AnimatePresence>
    {isOpen && (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-slate-900/90 backdrop-blur-md"
        />
        <motion.div 
          initial={{ opacity: 0, scale: 0.9, y: 40 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 40 }}
          className="relative w-full max-w-5xl bg-slate-900 rounded-[2rem] shadow-2xl overflow-hidden border border-white/10"
        >
          {/* Header */}
          <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-center z-20 bg-gradient-to-b from-black/80 to-transparent">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-rose-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(244,63,94,0.8)]"></div>
              <div>
                <h3 className="text-white font-bold text-lg leading-none">{cameraName}</h3>
                <p className="text-white/50 text-xs mt-1 uppercase tracking-widest font-bold">Live Stream • CAM-0{cameraId}</p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Video Feed Area */}
          <div className="aspect-video relative bg-black flex items-center justify-center group">
            <img 
              src={`https://picsum.photos/seed/live${cameraId}/1920/1080`} 
              alt="Live Feed"
              className="w-full h-full object-cover opacity-80"
              referrerPolicy="no-referrer"
            />
            
            {/* Overlay Grid */}
            <div className="absolute inset-0 pointer-events-none opacity-20">
              <div className="w-full h-full border-[0.5px] border-white/30 grid grid-cols-4 grid-rows-4">
                {Array.from({ length: 16 }).map((_, i) => (
                  <div key={i} className="border-[0.5px] border-white/10"></div>
                ))}
              </div>
            </div>

            {/* AI Detection Overlay */}
            <div className="absolute inset-0 pointer-events-none">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="absolute top-[20%] left-[30%] w-[15%] h-[40%] border-2 border-brand-400 rounded-lg"
              >
                <div className="absolute -top-7 left-0 bg-brand-400 text-white text-[10px] px-2 py-0.5 font-bold rounded-t-lg">
                  บุคคล (98%)
                </div>
              </motion.div>
            </div>

            {/* Controls Overlay */}
            <div className="absolute bottom-0 left-0 right-0 p-8 flex justify-between items-end z-20 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="flex gap-4">
                <button className="p-3 bg-white/10 hover:bg-white/20 rounded-xl text-white backdrop-blur-md transition-all">
                  <Play className="w-5 h-5 fill-current" />
                </button>
                <div className="flex flex-col justify-center">
                  <div className="w-48 h-1.5 bg-white/20 rounded-full overflow-hidden">
                    <div className="w-full h-full bg-brand-500 animate-[shimmer_2s_infinite]"></div>
                  </div>
                  <p className="text-[10px] text-white/50 mt-2 font-bold uppercase tracking-tighter">Buffer Status: Optimal</p>
                </div>
              </div>
              <div className="flex gap-3">
                <button className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-white backdrop-blur-md text-xs font-bold transition-all">
                  Snapshot
                </button>
                <button className="px-4 py-2 bg-brand-600 hover:bg-brand-700 rounded-xl text-white font-bold text-xs transition-all shadow-lg shadow-brand-500/20">
                  Record
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    )}
  </AnimatePresence>
);

const VisitorRegistrationModal = ({ 
  isOpen, 
  onClose, 
  onRegister 
}: { 
  isOpen: boolean, 
  onClose: () => void, 
  onRegister: (data: any) => void 
}) => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    plate: '',
    unit: '',
    name: '',
    type: 'guest',
    entryTime: '',
    date: new Date().toISOString().split('T')[0]
  });
  const [qrValue, setQrValue] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const mockQrData = `SMARTGATE-${formData.plate}-${Date.now()}`;
    setQrValue(mockQrData);
    setStep(2);
    onRegister({ ...formData, id: Date.now(), status: 'upcoming', qrData: mockQrData });
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-lg bg-white rounded-[2.5rem] shadow-2xl p-8 overflow-hidden"
          >
            <div className="flex justify-between items-center mb-8">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-brand-50 flex items-center justify-center">
                  <UserPlus className="w-6 h-6 text-brand-600" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900">ลงทะเบียนล่วงหน้า</h3>
                  <p className="text-xs text-slate-500">สำหรับแขกหรือบริการส่งของ</p>
                </div>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                <X className="w-6 h-6 text-slate-400" />
              </button>
            </div>

            {step === 1 ? (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase ml-1">ทะเบียนรถ</label>
                    <input 
                      required
                      value={formData.plate}
                      onChange={(e) => setFormData({...formData, plate: e.target.value})}
                      placeholder="กข 1234"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase ml-1">บ้านเลขที่</label>
                    <input 
                      required
                      value={formData.unit}
                      onChange={(e) => setFormData({...formData, unit: e.target.value})}
                      placeholder="123/45"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase ml-1">ชื่อผู้ติดต่อ</label>
                  <input 
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    placeholder="คุณสมชาย ใจดี"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase ml-1">วันที่เข้า</label>
                    <div className="relative">
                      <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input 
                        type="date"
                        required
                        value={formData.date}
                        onChange={(e) => setFormData({...formData, date: e.target.value})}
                        className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase ml-1">เวลาโดยประมาณ</label>
                    <div className="relative">
                      <Clock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input 
                        type="time"
                        required
                        value={formData.entryTime}
                        onChange={(e) => setFormData({...formData, entryTime: e.target.value})}
                        className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase ml-1">ประเภท</label>
                  <div className="flex gap-2">
                    {['guest', 'delivery', 'service'].map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setFormData({...formData, type: t})}
                        className={cn(
                          "flex-1 py-2 rounded-xl text-xs font-bold transition-all",
                          formData.type === t ? "bg-brand-600 text-white shadow-lg shadow-brand-200" : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                        )}
                      >
                        {t === 'guest' ? 'แขก' : t === 'delivery' ? 'ส่งของ' : 'บริการ'}
                      </button>
                    ))}
                  </div>
                </div>

                <button 
                  type="submit"
                  className="w-full py-4 bg-brand-600 text-white rounded-2xl font-bold shadow-xl shadow-brand-200 hover:bg-brand-700 transition-all mt-4"
                >
                  สร้างรหัสผ่านประตู
                </button>
              </form>
            ) : (
              <div className="text-center space-y-6 py-4">
                <div className="p-8 bg-slate-50 rounded-[2rem] inline-block border-2 border-dashed border-slate-200">
                  <QRCodeSVG value={qrValue} size={200} level="H" includeMargin={true} />
                </div>
                <div>
                  <h4 className="text-2xl font-black text-slate-900 mb-2">ลงทะเบียนสำเร็จ!</h4>
                  <p className="text-slate-500 text-sm">ส่ง QR Code นี้ให้ผู้เยี่ยมชมเพื่อใช้สแกนเข้าโครงการ</p>
                </div>
                <div className="p-4 bg-brand-50 rounded-2xl text-left">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[10px] font-bold text-brand-600 uppercase">Visitor Pass</span>
                    <span className="text-[10px] font-bold text-brand-600">{formData.date}</span>
                  </div>
                  <p className="font-bold text-slate-900">{formData.plate}</p>
                  <p className="text-xs text-slate-600">บ้านเลขที่ {formData.unit} • {formData.name}</p>
                </div>
                <div className="flex gap-3">
                  <button 
                    onClick={onClose}
                    className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-2xl font-bold hover:bg-slate-200 transition-all"
                  >
                    ปิดหน้าต่าง
                  </button>
                  <button 
                    className="flex-1 py-3 bg-brand-600 text-white rounded-2xl font-bold shadow-lg shadow-brand-200 hover:bg-brand-700 transition-all"
                  >
                    แชร์ QR Code
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

const NeighborhoodIntelligence = () => {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ text: string, links: any[] } | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    
    setLoading(true);
    try {
      // Mock coordinates for a central Bangkok location if geolocation fails
      const info = await getNeighborhoodInfo(query, 13.7563, 100.5018);
      setResult(info);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const clearSearch = () => {
    setQuery('');
    setResult(null);
  };

  return (
    <div className="glass-card p-6 bg-gradient-to-br from-brand-50 to-white border-brand-100">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-brand-100 rounded-lg">
            <Sparkles className="w-5 h-5 text-brand-600" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">AI วิเคราะห์พื้นที่รอบโครงการ</h3>
            <p className="text-xs text-slate-500">ค้นหาสถานที่สำคัญและข้อมูลเรียลไทม์ด้วย Google Maps</p>
          </div>
        </div>
        {(query || result) && (
          <button 
            onClick={() => setShowConfirm(true)}
            className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
            title="ล้างการค้นหา"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        )}
      </div>

      <form onSubmit={handleSearch} className="relative mb-6">
        <input 
          type="text" 
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="เช่น 'โรงพยาบาลสัตว์ที่ใกล้ที่สุด' หรือ 'ร้านสะดวกซื้อที่เปิด 24 ชม.'"
          className="w-full pl-4 pr-12 py-3 bg-white border border-slate-200 rounded-2xl focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all shadow-sm"
        />
        <button 
          disabled={loading}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-brand-600 text-white rounded-xl hover:bg-brand-700 disabled:opacity-50 transition-colors"
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
        </button>
      </form>

      <AnimatePresence mode="wait">
        {result && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <div className="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm">
              <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{result.text}</p>
            </div>
            
            {result.links.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {result.links.map((link, idx) => (
                  <a 
                    key={idx}
                    href={link.uri}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-3 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 transition-colors group"
                  >
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-brand-500" />
                      <span className="text-xs font-bold text-slate-700 truncate max-w-[150px]">{link.title}</span>
                    </div>
                    <ExternalLink className="w-3 h-3 text-slate-400 group-hover:text-brand-600 transition-colors" />
                  </a>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <ConfirmationDialog 
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={clearSearch}
        title="ยืนยันการล้างข้อมูล"
        message="คุณต้องการล้างคำค้นหาและผลลัพธ์ทั้งหมดใช่หรือไม่? ข้อมูลนี้จะไม่สามารถกู้คืนได้"
      />
    </div>
  );
};

const SidebarItem = ({ icon: Icon, label, active, onClick }: { icon: any, label: string, active: boolean, onClick: () => void }) => (
  <button
    onClick={onClick}
    className={cn(
      "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group",
      active 
        ? "bg-brand-600 text-white shadow-lg shadow-brand-200" 
        : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
    )}
  >
    <Icon className={cn("w-5 h-5", active ? "text-white" : "text-slate-400 group-hover:text-slate-900")} />
    <span className="font-medium">{label}</span>
    {active && <motion.div layoutId="active-pill" className="ml-auto w-1.5 h-1.5 rounded-full bg-white" />}
  </button>
);

const StatCard = ({ label, value, trend, icon: Icon, color }: { label: string, value: string, trend?: string, icon: any, color: string }) => (
  <div className="glass-card p-6 flex flex-col gap-2">
    <div className="flex justify-between items-start">
      <div className={cn("p-2 rounded-lg", color)}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      {trend && (
        <span className={cn("text-xs font-medium px-2 py-1 rounded-full", trend.startsWith('+') ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700")}>
          {trend}
        </span>
      )}
    </div>
    <div className="mt-2">
      <p className="text-sm text-slate-500 font-medium">{label}</p>
      <h3 className="text-2xl font-bold text-slate-900">{value}</h3>
    </div>
  </div>
);

const NeighborhoodMap = ({ pets, mode = 'simplified' }: { pets: PetAlert[], mode?: 'simplified' | 'satellite' }) => (
  <div className="relative w-full aspect-[16/9] bg-[#f8f9fa] rounded-3xl overflow-hidden border-4 border-white shadow-2xl">
    {/* Google Maps Style Background */}
    {mode === 'satellite' ? (
      <img 
        src="https://images.unsplash.com/photo-1582298538104-fe2e74c27f59?q=80&w=2000&auto=format&fit=crop" 
        alt="Satellite View" 
        className="absolute inset-0 w-full h-full object-cover"
        referrerPolicy="no-referrer"
      />
    ) : (
      <div className="absolute inset-0 bg-[#ebebeb]">
        <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          {/* Blocks */}
          <rect x="0" y="0" width="48" height="48" fill="#ffffff" />
          <rect x="52" y="0" width="48" height="48" fill="#ffffff" />
          <rect x="0" y="52" width="48" height="48" fill="#ffffff" />
          <rect x="52" y="52" width="48" height="48" fill="#ffffff" />
          {/* Main Roads */}
          <path d="M 0 50 L 100 50" stroke="#ffffff" strokeWidth="4" fill="none" />
          <path d="M 50 0 L 50 100" stroke="#ffffff" strokeWidth="4" fill="none" />
          {/* Road Outlines */}
          <path d="M 0 48 L 100 48" stroke="#dadce0" strokeWidth="0.5" fill="none" />
          <path d="M 0 52 L 100 52" stroke="#dadce0" strokeWidth="0.5" fill="none" />
          <path d="M 48 0 L 48 100" stroke="#dadce0" strokeWidth="0.5" fill="none" />
          <path d="M 52 0 L 52 100" stroke="#dadce0" strokeWidth="0.5" fill="none" />
        </svg>
      </div>
    )}

    {/* Overlays Layer */}
    <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
      {/* Alert Zones with improved visuals */}
      {ALERT_ZONES.map(zone => (
        <g key={zone.id}>
          <rect 
            x={zone.x} 
            y={zone.y} 
            width={zone.w} 
            height={zone.h} 
            fill={zone.color}
            fillOpacity={mode === 'satellite' ? 0.2 : 0.1}
            stroke={zone.color}
            strokeWidth="1"
            className="animate-pulse"
            style={{ animationDuration: '3s' }}
          />
          {/* Corner accents for zones */}
          <path d={`M ${zone.x} ${zone.y + 2} L ${zone.x} ${zone.y} L ${zone.x + 2} ${zone.y}`} stroke={zone.color} strokeWidth="2" fill="none" />
          <path d={`M ${zone.x + zone.w - 2} ${zone.y} L ${zone.x + zone.w} ${zone.y} L ${zone.x + zone.w} ${zone.y + 2}`} stroke={zone.color} strokeWidth="2" fill="none" />
        </g>
      ))}
    </svg>

    {/* Camera Points */}
    {CAMERA_POINTS.map(cam => (
      <div 
        key={cam.id}
        className="absolute -translate-x-1/2 -translate-y-1/2 group z-10"
        style={{ left: `${cam.x}%`, top: `${cam.y}%` }}
      >
        <div className="bg-slate-900/80 backdrop-blur-sm p-1.5 rounded-full border border-white/20 shadow-lg cursor-help transition-transform hover:scale-125">
          <Camera className="w-3 h-3 text-brand-400" />
        </div>
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20">
          <div className="bg-slate-900 text-white text-[10px] px-2 py-1 rounded whitespace-nowrap shadow-xl border border-white/10">
            {cam.name}
          </div>
        </div>
      </div>
    ))}

    {/* Zone Labels */}
    {ALERT_ZONES.map(zone => (
      <div 
        key={zone.id}
        className={cn(
          "absolute text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-tighter shadow-sm z-10",
          zone.type === 'danger' ? "bg-rose-500 text-white" : "bg-emerald-500 text-white"
        )}
        style={{ left: `${zone.x + 1}%`, top: `${zone.y + 1}%` }}
      >
        {zone.name}
      </div>
    ))}

    {/* Pet Markers */}
    {pets.map(pet => (
      <motion.div
        key={pet.id}
        initial={{ scale: 0, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="absolute -translate-x-1/2 -translate-y-1/2 group cursor-pointer z-20"
        style={{ left: `${pet.x}%`, top: `${pet.y}%` }}
      >
        <div className="relative">
          {/* Marker Pin Style */}
          <div className="flex flex-col items-center">
            <div className={cn(
              "relative w-12 h-12 rounded-2xl border-2 border-white shadow-2xl overflow-hidden transition-transform group-hover:-translate-y-1",
              pet.status === 'missing' ? "ring-4 ring-rose-500 ring-offset-2 animate-bounce" : "ring-4 ring-emerald-500 ring-offset-2"
            )}>
              <img src={pet.image} alt={pet.breed} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              {/* Type Icon Overlay */}
              <div className="absolute bottom-0 right-0 bg-white p-1 rounded-tl-lg shadow-md">
                {pet.type === 'dog' ? <Dog className="w-3 h-3 text-brand-600" /> : <Cat className="w-3 h-3 text-brand-600" />}
              </div>
            </div>
            {/* Pin Point */}
            <div className="w-3 h-3 bg-white rotate-45 -mt-1.5 border-r-2 border-b-2 border-white shadow-lg"></div>
          </div>
          
          {/* Tooltip */}
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-4 opacity-0 group-hover:opacity-100 transition-all pointer-events-none translate-y-2 group-hover:translate-y-0">
            <div className="bg-white p-3 rounded-2xl shadow-2xl border border-slate-100 min-w-[140px]">
              <div className="flex items-center gap-2 mb-1">
                <div className={cn("w-2 h-2 rounded-full", pet.status === 'missing' ? "bg-rose-500" : "bg-emerald-500")}></div>
                <p className="text-xs font-bold text-slate-900">{pet.breed}</p>
              </div>
              <p className="text-[10px] text-slate-500 flex items-center gap-1">
                <Clock className="w-3 h-3" /> {pet.lastSeen}
              </p>
              <p className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                <MapPin className="w-3 h-3" /> {pet.location}
              </p>
            </div>
          </div>
        </div>
      </motion.div>
    ))}
  </div>
);

export default function App() {
  const [activeView, setActiveView] = useState<View>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [mapMode, setMapMode] = useState<'simplified' | 'satellite'>('simplified');
  const [selectedCamera, setSelectedCamera] = useState<{ id: number, name: string } | null>(null);
  const [showVisitorReg, setShowVisitorReg] = useState(false);
  const [visitors, setVisitors] = useState(MOCK_VISITORS);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const renderView = () => {
    switch (activeView) {
      case 'dashboard':
        return (
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatCard label="ผู้เยี่ยมชมขณะนี้" value="12" trend="+3" icon={Users} color="bg-blue-500" />
              <StatCard label="แจ้งเตือนเกินเวลา" value="2" trend="-1" icon={AlertTriangle} color="bg-rose-500" />
              <StatCard label="การใช้พลังงานรวม" value="452 kWh" trend="+12%" icon={Zap} color="bg-amber-500" />
              <StatCard label="สถานะความปลอดภัย" value="ปลอดภัย" icon={Shield} color="bg-emerald-500" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-8">
                {/* Area Map Section - Moved to top */}
                <div className="glass-card p-6">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                    <div>
                      <h3 className="text-xl font-bold">แผนที่โครงการ & การเฝ้าระวัง AI</h3>
                      <p className="text-sm text-slate-500">แสดงตำแหน่งสัตว์เลี้ยงและยานพาหนะแบบเรียลไทม์</p>
                    </div>
                    <div className="flex items-center gap-4 bg-slate-100 p-1 rounded-xl">
                      <button 
                        onClick={() => setMapMode('simplified')}
                        className={cn(
                          "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                          mapMode === 'simplified' ? "bg-white text-brand-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                        )}
                      >
                        <MapIcon className="w-3.5 h-3.5" />
                        แผนที่ปกติ
                      </button>
                      <button 
                        onClick={() => setMapMode('satellite')}
                        className={cn(
                          "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                          mapMode === 'satellite' ? "bg-white text-brand-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                        )}
                      >
                        <Layers className="w-3.5 h-3.5" />
                        ดาวเทียม
                      </button>
                    </div>
                  </div>
                  <NeighborhoodMap pets={MOCK_PETS} mode={mapMode} />
                </div>

                <NeighborhoodIntelligence />
              </div>

              <div className="space-y-8">
                <div className="glass-card p-6 bg-slate-900 text-white">
                  <h4 className="font-bold mb-2">ระบบเฝ้าระวังชุมชน</h4>
                  <p className="text-xs text-slate-400 mb-4">ระบบ AI จะแจ้งเตือนลูกบ้านทุกคนผ่าน LINE ทันทีเมื่อพบสัตว์เลี้ยงในโซนอันตราย</p>
                  <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl">
                    <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
                      <Smartphone className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-bold">การแจ้งเตือน LINE</p>
                      <p className="text-[10px] text-slate-500">เปิดใช้งานแล้ว 142 บ้าน</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="glass-card p-6">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-bold">แนวโน้มการใช้พลังงาน</h3>
                  <select className="text-sm border-none bg-slate-100 rounded-lg px-3 py-1 focus:ring-2 focus:ring-brand-500">
                    <option>รายสัปดาห์</option>
                    <option>รายเดือน</option>
                  </select>
                </div>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={UTILITY_DATA}>
                      <defs>
                        <linearGradient id="colorUsage" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                      <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                      <Tooltip 
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                      />
                      <Area type="monotone" dataKey="usage" stroke="#0ea5e9" strokeWidth={3} fillOpacity={1} fill="url(#colorUsage)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="glass-card p-6">
                <h3 className="text-lg font-bold mb-6">ผู้เยี่ยมชมล่าสุด</h3>
                <div className="space-y-4">
                  {MOCK_VISITORS.map((visitor) => (
                    <div key={visitor.id} className="flex items-center gap-4 p-3 rounded-xl hover:bg-slate-50 transition-colors">
                      <div className={cn(
                        "p-2 rounded-lg",
                        visitor.status === 'overstay' ? "bg-rose-100 text-rose-600" : "bg-blue-100 text-blue-600"
                      )}>
                        <Car className="w-5 h-5" />
                      </div>
                      <div className="flex-1">
                        <p className="font-bold text-slate-900">{visitor.plate}</p>
                        <p className="text-xs text-slate-500">บ้านเลขที่ {visitor.unit} • {visitor.type === 'guest' ? 'แขก' : visitor.type === 'delivery' ? 'ส่งของ' : 'บริการ'}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-slate-700">{visitor.entryTime}</p>
                        <span className={cn(
                          "text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full",
                          visitor.status === 'overstay' ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-700"
                        )}>
                          {visitor.status === 'active' ? 'กำลังอยู่' : visitor.status === 'overstay' ? 'เกินเวลา' : 'ออกแล้ว'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
                <button className="w-full mt-6 py-2 text-sm font-semibold text-brand-600 hover:bg-brand-50 rounded-lg transition-colors">
                  ดูบันทึกทั้งหมด
                </button>
              </div>
            </div>
          </div>
        );
      case 'visitors':
        return (
          <div className="space-y-8">
            <div className="glass-card overflow-hidden">
              <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                <h3 className="text-xl font-bold">จัดการผู้เยี่ยมชม</h3>
                <div className="flex gap-2">
                  <button 
                    onClick={() => setShowVisitorReg(true)}
                    className="px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-bold shadow-sm hover:bg-brand-700 transition-colors flex items-center gap-2"
                  >
                    <UserPlus className="w-4 h-4" />
                    ลงทะเบียนล่วงหน้า
                  </button>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider font-bold">
                    <tr>
                      <th className="px-6 py-4">ทะเบียนรถ</th>
                      <th className="px-6 py-4">บ้านเลขที่</th>
                      <th className="px-6 py-4">เวลาเข้า</th>
                      <th className="px-6 py-4">ประเภท</th>
                      <th className="px-6 py-4">สถานะ</th>
                      <th className="px-6 py-4">จัดการ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {visitors.map((visitor) => (
                      <tr key={visitor.id} className="hover:bg-slate-50 transition-colors group">
                        <td className="px-6 py-4 font-bold text-slate-900">{visitor.plate}</td>
                        <td className="px-6 py-4 text-slate-600">บ้านเลขที่ {visitor.unit}</td>
                        <td className="px-6 py-4 text-slate-600">{visitor.entryTime}</td>
                        <td className="px-6 py-4">
                          <span className="capitalize text-sm font-medium text-slate-600">
                            {visitor.type === 'guest' ? 'แขก' : visitor.type === 'delivery' ? 'ส่งของ' : 'บริการ'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={cn(
                            "px-3 py-1 rounded-full text-xs font-bold",
                            visitor.status === 'overstay' ? "bg-rose-100 text-rose-700" : 
                            visitor.status === 'upcoming' ? "bg-blue-100 text-blue-700" : "bg-emerald-100 text-emerald-700"
                          )}>
                            {visitor.status === 'active' ? 'กำลังอยู่' : visitor.status === 'overstay' ? 'เกินเวลา' : visitor.status === 'upcoming' ? 'รอดำเนินการ' : 'ออกแล้ว'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <button className="p-2 text-slate-400 hover:text-brand-600 transition-colors">
                            <ChevronRight className="w-5 h-5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <VisitorRegistrationModal 
              isOpen={showVisitorReg}
              onClose={() => setShowVisitorReg(false)}
              onRegister={(newVisitor) => setVisitors([newVisitor, ...visitors])}
            />
          </div>
        );
      case 'pets':
        return (
          <div className="space-y-8">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-2xl font-bold">ระบบติดตามสัตว์เลี้ยง AI</h3>
                <p className="text-sm text-slate-500">เฝ้าระวังและติดตามตำแหน่งสัตว์เลี้ยงในโครงการแบบเรียลไทม์</p>
              </div>
              <button className="px-6 py-2 bg-rose-600 text-white rounded-xl font-bold shadow-lg shadow-rose-200 hover:bg-rose-700 transition-all">
                แจ้งสัตว์เลี้ยงหาย
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-6">
                <div className="glass-card p-4">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4 px-2">
                    <h4 className="font-bold flex items-center gap-2">
                      <Search className="w-4 h-4 text-brand-500" />
                      ตำแหน่งที่พบล่าสุด
                    </h4>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-lg">
                        <button 
                          onClick={() => setMapMode('simplified')}
                          className={cn(
                            "p-1.5 rounded-md transition-all",
                            mapMode === 'simplified' ? "bg-white text-brand-600 shadow-sm" : "text-slate-400"
                          )}
                          title="แผนที่ปกติ"
                        >
                          <MapIcon className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => setMapMode('satellite')}
                          className={cn(
                            "p-1.5 rounded-md transition-all",
                            mapMode === 'satellite' ? "bg-white text-brand-600 shadow-sm" : "text-slate-400"
                          )}
                          title="ดาวเทียม"
                        >
                          <Layers className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="h-4 w-[1px] bg-slate-200 mx-1"></div>
                      <div className="flex gap-2">
                        <span className="flex items-center gap-1 text-[10px] font-bold text-slate-400">
                          <div className="w-2 h-2 rounded-full bg-emerald-500"></div> พบตัว
                        </span>
                        <span className="flex items-center gap-1 text-[10px] font-bold text-slate-400">
                          <div className="w-2 h-2 rounded-full bg-rose-500"></div> หาย
                        </span>
                      </div>
                    </div>
                  </div>
                  <NeighborhoodMap pets={MOCK_PETS} mode={mapMode} />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {MOCK_PETS.map((pet) => (
                    <div key={pet.id} className="glass-card overflow-hidden group flex">
                      <div className="w-32 h-32 overflow-hidden flex-shrink-0">
                        <img 
                          src={pet.image} 
                          alt={pet.breed} 
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                      <div className="p-4 flex-1">
                        <div className="flex justify-between items-start">
                          <div className="flex items-center gap-2 mb-1">
                            <Dog className="w-3 h-3 text-slate-400" />
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{pet.type === 'dog' ? 'สุนัข' : 'แมว'}</span>
                          </div>
                          <span className={cn(
                            "text-[10px] font-bold px-2 py-0.5 rounded-full",
                            pet.status === 'spotted' ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
                          )}>
                            {pet.status === 'spotted' ? 'พบตัว' : 'หาย'}
                          </span>
                        </div>
                        <h4 className="font-bold text-slate-900">{pet.breed}</h4>
                        <p className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                          <Clock className="w-3 h-3" /> {pet.lastSeen}
                        </p>
                        <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                          <Search className="w-3 h-3" /> {pet.location}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-6">
                <div className="glass-card p-6">
                  <h4 className="font-bold mb-4 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-500" />
                    โซนเฝ้าระวังอันตราย
                  </h4>
                  <div className="space-y-4">
                    {ALERT_ZONES.map(zone => (
                      <div key={zone.id} className={cn(
                        "p-4 rounded-xl border-l-4",
                        zone.type === 'danger' ? "bg-rose-50 border-rose-500" : "bg-emerald-50 border-emerald-500"
                      )}>
                        <p className={cn("text-sm font-bold", zone.type === 'danger' ? "text-rose-900" : "text-emerald-900")}>
                          {zone.name}
                        </p>
                        <p className={cn("text-xs mt-1", zone.type === 'danger' ? "text-rose-700" : "text-emerald-700")}>
                          {zone.type === 'danger' ? "เสี่ยงต่อการหลุดออกนอกโครงการ ระบบ AI กำลังเฝ้าดู" : "พื้นที่ปลอดภัยสำหรับสัตว์เลี้ยง"}
                        </p>
                        <div className="mt-3 flex justify-between items-center">
                          <span className="text-[10px] font-bold uppercase text-slate-400">สถานะ: เปิดใช้งาน</span>
                          <button className="text-[10px] font-bold text-brand-600 hover:underline">แก้ไขโซน</button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <button className="w-full mt-6 py-3 border-2 border-dashed border-slate-200 rounded-xl text-sm font-bold text-slate-400 hover:bg-slate-50 transition-all">
                    + เพิ่มโซนเฝ้าระวังใหม่
                  </button>
                </div>

                <div className="glass-card p-6 bg-slate-900 text-white">
                  <h4 className="font-bold mb-2">ระบบเฝ้าระวังชุมชน</h4>
                  <p className="text-xs text-slate-400 mb-4">ระบบ AI จะแจ้งเตือนลูกบ้านทุกคนผ่าน LINE ทันทีเมื่อพบสัตว์เลี้ยงในโซนอันตราย</p>
                  <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl">
                    <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
                      <Smartphone className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-bold">การแจ้งเตือน LINE</p>
                      <p className="text-[10px] text-slate-500">เปิดใช้งานแล้ว 142 บ้าน</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      case 'utilities':
        return (
          <div className="space-y-8">
             <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 glass-card p-8">
                  <h3 className="text-xl font-bold mb-8">การใช้พลังงานในโครงการ</h3>
                  <div className="h-[400px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={UTILITY_DATA}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                        <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                        <Tooltip 
                          contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                        />
                        <Line type="monotone" dataKey="usage" stroke="#f59e0b" strokeWidth={4} dot={{ r: 6, fill: '#f59e0b', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 8 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                <div className="space-y-6">
                  <div className="glass-card p-6 bg-brand-600 text-white">
                    <p className="text-brand-100 text-sm font-medium">รายได้รวม (เดือนนี้)</p>
                    <h3 className="text-3xl font-bold mt-1">฿142,500</h3>
                    <div className="mt-4 flex items-center gap-2 text-brand-100 text-xs">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>92% ของลูกบ้านชำระแล้ว</span>
                    </div>
                  </div>
                  <div className="glass-card p-6">
                    <h4 className="font-bold mb-4">เมนูจัดการด่วน</h4>
                    <div className="space-y-3">
                      <button className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors">
                        <span className="text-sm font-medium">ออกใบแจ้งหนี้</span>
                        <ChevronRight className="w-4 h-4 text-slate-400" />
                      </button>
                      <button className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors">
                        <span className="text-sm font-medium">การบำรุงรักษาระบบ</span>
                        <ChevronRight className="w-4 h-4 text-slate-400" />
                      </button>
                      <button className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors">
                        <span className="text-sm font-medium">ตั้งค่าอัตราค่าบริการ</span>
                        <ChevronRight className="w-4 h-4 text-slate-400" />
                      </button>
                    </div>
                  </div>
                </div>
             </div>
          </div>
        );
      case 'security':
        return (
          <div className="space-y-8">
            <div className="flex justify-between items-center">
              <h3 className="text-2xl font-bold">ระบบตรวจตราความปลอดภัย AI</h3>
              <div className="flex gap-3">
                <span className="flex items-center gap-2 px-3 py-1 bg-emerald-100 text-emerald-700 rounded-lg text-xs font-bold">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                  AI กำลังทำงาน
                </span>
              </div>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {[
                { id: 1, name: 'ประตูทางเข้าทิศเหนือ' },
                { id: 2, name: 'สวนสาธารณะส่วนกลาง' },
                { id: 3, name: 'ลานจอดรถคลับเฮาส์' },
                { id: 4, name: 'ประตูทางออกทิศใต้' }
              ].map((cam) => (
                <div key={cam.id} className="glass-card overflow-hidden relative group cursor-pointer" onClick={() => setSelectedCamera(cam)}>
                  <div className="aspect-video bg-slate-900 relative">
                    <img 
                      src={`https://picsum.photos/seed/security${cam.id}/800/450`} 
                      className="w-full h-full object-cover opacity-60 transition-transform duration-700 group-hover:scale-110"
                      referrerPolicy="no-referrer"
                    />
                    {/* Simulated AI Bounding Boxes */}
                    <div className="absolute top-1/4 left-1/3 w-24 h-40 border-2 border-brand-400 rounded-sm">
                      <span className="absolute -top-6 left-0 bg-brand-400 text-white text-[10px] px-1 font-bold">บุคคล 98%</span>
                    </div>
                    
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-60 group-hover:opacity-80 transition-opacity"></div>
                    
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all scale-90 group-hover:scale-100">
                      <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center border border-white/30">
                        <Maximize2 className="w-8 h-8 text-white" />
                      </div>
                    </div>

                    <div className="absolute bottom-4 left-4 text-white">
                      <p className="text-xs font-bold opacity-70">กล้อง-0{cam.id}</p>
                      <p className="text-sm font-bold">{cam.name}</p>
                    </div>
                    <div className="absolute top-4 right-4 flex gap-2">
                      <div className="px-2 py-1 bg-rose-500 text-white text-[10px] font-bold rounded flex items-center gap-1">
                        <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></div>
                        LIVE
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <CameraFeedModal 
              isOpen={!!selectedCamera}
              onClose={() => setSelectedCamera(null)}
              cameraName={selectedCamera?.name || ''}
              cameraId={selectedCamera?.id || 0}
            />

            <div className="glass-card p-6">
              <h4 className="font-bold mb-4">เหตุการณ์ความปลอดภัยล่าสุด</h4>
              <div className="space-y-4">
                <div className="flex items-center gap-4 p-3 bg-rose-50 rounded-xl border border-rose-100">
                  <AlertTriangle className="w-5 h-5 text-rose-500" />
                  <div className="flex-1">
                    <p className="text-sm font-bold text-rose-900">ตรวจพบยานพาหนะไม่ได้รับอนุญาต</p>
                    <p className="text-xs text-rose-700">โซน B - ประตูหลัง • 2 นาทีที่แล้ว</p>
                  </div>
                  <button className="px-4 py-1 bg-rose-500 text-white text-xs font-bold rounded-lg">แจ้งรปภ.</button>
                </div>
                <div className="flex items-center gap-4 p-3 bg-slate-50 rounded-xl">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  <div className="flex-1">
                    <p className="text-sm font-bold text-slate-900">ตรวจสอบรอบโครงการเสร็จสิ้น</p>
                    <p className="text-xs text-slate-500">ทุกโซนปลอดภัย • 15 นาทีที่แล้ว</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      case 'smarthome':
        return (
          <div className="space-y-8">
            <div className="flex justify-between items-center">
              <h3 className="text-2xl font-bold">ระบบบ้านอัจฉริยะ</h3>
              <div className="flex gap-2">
                <button className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg text-sm font-bold hover:bg-slate-200 transition-colors">
                  เพิ่มอุปกรณ์
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { name: 'ไฟห้องนั่งเล่น', icon: Zap, status: 'เปิด', color: 'text-amber-500', bg: 'bg-amber-50' },
                { name: 'เครื่องปรับอากาศ', icon: Zap, status: '24°C', color: 'text-blue-500', bg: 'bg-blue-50' },
                { name: 'กลอนประตูหลัก', icon: Shield, status: 'ล็อคแล้ว', color: 'text-emerald-500', bg: 'bg-emerald-50' },
                { name: 'ประตูโรงรถ', icon: Home, status: 'ปิดแล้ว', color: 'text-slate-500', bg: 'bg-slate-50' },
              ].map((device) => (
                <div key={device.name} className="glass-card p-6 hover:shadow-lg transition-all cursor-pointer group">
                  <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110", device.bg)}>
                    <device.icon className={cn("w-6 h-6", device.color)} />
                  </div>
                  <h4 className="font-bold text-slate-900">{device.name}</h4>
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-sm text-slate-500 font-medium">{device.status}</span>
                    <div className="w-10 h-5 bg-slate-200 rounded-full relative">
                      <div className="absolute right-1 top-1 w-3 h-3 bg-white rounded-full shadow-sm"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="glass-card p-8 bg-slate-900 text-white relative overflow-hidden">
              <div className="relative z-10">
                <h3 className="text-2xl font-bold mb-2">แอปพลิเคชันสำหรับลูกบ้าน</h3>
                <p className="text-slate-400 max-w-md mb-6">เชื่อมต่ออุปกรณ์ในบ้านและจัดการผู้เยี่ยมชมได้ง่ายๆ ผ่านสมาร์ทโฟนของคุณ รองรับทั้ง iOS และ Android</p>
                <div className="flex gap-4">
                  <button className="px-6 py-2 bg-white text-slate-900 rounded-xl font-bold text-sm">ดาวน์โหลดเลย</button>
                  <button className="px-6 py-2 bg-white/10 backdrop-blur-md text-white rounded-xl font-bold text-sm">เรียนรู้เพิ่มเติม</button>
                </div>
              </div>
              <Smartphone className="absolute -right-10 -bottom-10 w-64 h-64 text-white/5 rotate-12" />
            </div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen flex bg-slate-50 font-sans">
      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-72 bg-white border-r border-slate-100 transition-transform duration-300 lg:relative lg:translate-x-0",
        !isSidebarOpen && "-translate-x-full"
      )}>
        <div className="h-full flex flex-col p-6">
          <div className="flex items-center gap-3 mb-10 px-2">
            <div className="w-10 h-10 bg-brand-600 rounded-xl flex items-center justify-center shadow-lg shadow-brand-200">
              <Shield className="text-white w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">SmartGate <span className="text-brand-600">AI</span></h1>
              <p className="text-[10px] uppercase tracking-widest font-bold text-slate-400">ระบบจัดการหมู่บ้านอัจฉริยะ</p>
            </div>
          </div>

          <nav className="flex-1 space-y-2">
            <SidebarItem icon={LayoutDashboard} label="แดชบอร์ด" active={activeView === 'dashboard'} onClick={() => setActiveView('dashboard')} />
            <SidebarItem icon={Users} label="บันทึกผู้เยี่ยมชม" active={activeView === 'visitors'} onClick={() => setActiveView('visitors')} />
            <SidebarItem icon={Dog} label="ติดตามสัตว์เลี้ยง" active={activeView === 'pets'} onClick={() => setActiveView('pets')} />
            <SidebarItem icon={Zap} label="ค่าสาธารณูปโภค" active={activeView === 'utilities'} onClick={() => setActiveView('utilities')} />
            <SidebarItem icon={Home} label="บ้านอัจฉริยะ" active={activeView === 'smarthome'} onClick={() => setActiveView('smarthome')} />
            <SidebarItem icon={Shield} label="ตรวจตราความปลอดภัย" active={activeView === 'security'} onClick={() => setActiveView('security')} />
          </nav>

          <div className="mt-auto pt-6 space-y-2 border-t border-slate-100">
            <SidebarItem icon={Settings} label="ตั้งค่า" active={false} onClick={() => {}} />
            <SidebarItem icon={HelpCircle} label="ช่วยเหลือ" active={false} onClick={() => {}} />
            <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-rose-500 hover:bg-rose-50 transition-colors">
              <LogOut className="w-5 h-5" />
              <span className="font-medium">ออกจากระบบ</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="h-20 bg-white/80 backdrop-blur-md border-b border-slate-100 sticky top-0 z-40 px-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="lg:hidden p-2 hover:bg-slate-100 rounded-lg">
              <Menu className="w-6 h-6" />
            </button>
            <div className="hidden md:flex items-center gap-3 bg-slate-100 px-4 py-2 rounded-xl w-80">
              <Search className="w-4 h-4 text-slate-400" />
              <input type="text" placeholder="ค้นหาลูกบ้าน, บ้านเลขที่, ทะเบียนรถ..." className="bg-transparent border-none text-sm focus:ring-0 w-full" />
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="hidden sm:flex flex-col text-right">
              <p className="text-sm font-bold text-slate-900">{currentTime.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}</p>
              <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">{currentTime.toLocaleDateString('th-TH', { weekday: 'long', month: 'short', day: 'numeric' })}</p>
            </div>
            
            <div className="flex items-center gap-3">
              <button className="relative p-2 text-slate-500 hover:bg-slate-100 rounded-xl transition-colors">
                <Bell className="w-5 h-5" />
                <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full border-2 border-white"></span>
              </button>
              <div className="h-8 w-[1px] bg-slate-200 mx-2"></div>
              <div className="flex items-center gap-3 pl-2">
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-bold text-slate-900">ผู้ดูแลระบบ</p>
                  <p className="text-[10px] text-slate-500 font-medium uppercase">ผู้จัดการนิติบุคคล</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-slate-200 overflow-hidden border-2 border-white shadow-sm">
                  <img src="https://picsum.photos/seed/admin/100/100" alt="รูปโปรไฟล์" referrerPolicy="no-referrer" />
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* View Content */}
        <div className="p-8 max-w-7xl mx-auto w-full">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeView}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {renderView()}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
