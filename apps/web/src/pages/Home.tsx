import { useEffect, useRef, useState } from 'react';
import { Button, Row, Col, Slider } from 'antd';
import { useNavigate } from 'react-router-dom';
import CTABanner from '../components/shared/CTABanner';
import { useInView, useInViewMulti } from '../hooks/useInView';
import { SapttaLogo } from '../components/layout/Navbar';
import ScrollReveal from '../components/shared/ScrollReveal';
import { estimatePayroll } from '../services/api';

/* ── Live Dynamic Clock Helper ── */
function LiveClock() {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  return (
    <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '1.25rem', color: 'var(--color-primary)' }}>
      {time.toLocaleTimeString()}
    </span>
  );
}

/* ── Interactive Particle System ── */
function FloatingParticle({ x, y, color, delay }: { x: number; y: number; color: string; delay: number }) {
  return (
    <div style={{
      position: 'absolute', left: `${x}%`, top: `${y}%`,
      width: 5, height: 5, borderRadius: '50%',
      background: color, opacity: 0.25,
      animation: `particleDrift ${4 + delay}s ${delay}s ease-in-out infinite`,
      pointerEvents: 'none',
    }} />
  );
}

function HeroCarousel() {
  const navigate = useNavigate();
  const [activeIndex, setActiveIndex] = useState(0);

  const CAROUSEL_SLIDES = [
    {
      id: 'hr', color: 'var(--color-primary)', accent: 'rgba(255,109,0,0.1)',
      title: 'Geofenced Attendance',
      content: (
        <div style={{ display: 'flex', height: '100%', background: '#F8F9FA' }}>
          {/* Dashboard Sidebar - Premium White Theme */}
          <div style={{ width: 240, background: '#FFFFFF', padding: '28px 20px', display: 'flex', flexDirection: 'column', gap: 12, borderRight: '1px solid rgba(10,17,40,0.06)' }}>
             <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 32, paddingLeft: 8 }}>
                <img src="/logo.png" style={{ height: 64, width: 'auto', objectFit: 'contain' }} alt="Logo" />
             </div>
             <div style={{ background: 'linear-gradient(90deg, rgba(255,109,0,0.08) 0%, transparent 100%)', borderLeft: '3px solid #FF6D00', color: '#FF6D00', padding: '12px 16px', borderRadius: '0 8px 8px 0', fontWeight: 700, fontSize: 14 }}>Live Terminal</div>
             <div style={{ color: 'rgba(10,17,40,0.6)', padding: '10px 16px', fontWeight: 600, fontSize: 14, transition: 'color 0.3s', cursor: 'pointer' }}>Shift Rosters</div>
             <div style={{ color: 'rgba(10,17,40,0.6)', padding: '10px 16px', fontWeight: 600, fontSize: 14, transition: 'color 0.3s', cursor: 'pointer' }}>Geo-Fences</div>
             <div style={{ marginTop: 'auto', background: 'rgba(255,109,0,0.04)', padding: 16, borderRadius: 12, border: '1px solid rgba(255,109,0,0.1)' }}>
                <div style={{ fontSize: 12, color: 'rgba(10,17,40,0.5)', marginBottom: 8 }}>Active Agents</div>
                <div style={{ fontSize: 24, fontWeight: 800, color: '#FF6D00' }}>1,492</div>
             </div>
          </div>
          {/* Main Area */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <div style={{ height: 72, background: 'rgba(255,255,255,0.8)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(10,17,40,0.06)', display: 'flex', alignItems: 'center', padding: '0 32px', justifyContent: 'space-between' }}>
              <div style={{ fontWeight: 800, fontSize: 20, color: '#0B0F19' }}>Live Attendance Feed</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(255,109,0,0.08)', padding: '8px 16px', borderRadius: 20, color: '#FF6D00', fontWeight: 700, fontSize: 13 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#FF6D00', boxShadow: '0 0 12px rgba(255,109,0,0.5)', animation: 'logoBgPulse 2s infinite' }} /> System Active
              </div>
            </div>
            <div style={{ padding: 32, flex: 1, overflow: 'hidden' }}>
              <div style={{ display: 'flex', gap: 24, height: '100%' }}>
                {/* Premium Map/Chart */}
                <div style={{ flex: 1, background: 'white', borderRadius: 20, border: '1px solid rgba(10,17,40,0.06)', display: 'flex', flexDirection: 'column', padding: 24, boxShadow: '0 12px 32px rgba(10,17,40,0.02)' }}>
                   <div style={{ fontWeight: 800, marginBottom: 20, fontSize: 16, display: 'flex', justifyContent: 'space-between' }}>
                     Regional Check-ins
                     <span style={{ color: 'var(--color-primary)', fontSize: 13 }}>+12% Today</span>
                   </div>
                   <div style={{ flex: 1, background: '#F8F9FA', borderRadius: 16, position: 'relative', overflow: 'hidden', border: '1px solid rgba(10,17,40,0.04)' }}>
                      {/* Simulated Grid Background */}
                      <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(10,17,40,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(10,17,40,0.03) 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
                      
                      {/* Pulsing Nodes */}
                      <div style={{ position: 'absolute', top: '35%', left: '42%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                         <div style={{ position: 'absolute', width: 40, height: 40, borderRadius: '50%', border: '1px solid #FF6D00', animation: 'logoBgPulse 2s infinite' }} />
                         <div style={{ width: 12, height: 12, background: 'var(--color-primary)', borderRadius: '50%', boxShadow: '0 4px 12px rgba(255,109,0,0.4)' }} />
                      </div>
                      <div style={{ position: 'absolute', top: '55%', left: '32%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                         <div style={{ position: 'absolute', width: 30, height: 30, borderRadius: '50%', border: '1px solid #FF6D00', animation: 'logoBgPulse 2.5s infinite' }} />
                         <div style={{ width: 10, height: 10, background: 'var(--color-primary)', borderRadius: '50%', boxShadow: '0 4px 12px rgba(255,109,0,0.4)' }} />
                      </div>
                      <div style={{ position: 'absolute', top: '75%', left: '55%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                         <div style={{ position: 'absolute', width: 50, height: 50, borderRadius: '50%', border: '1px solid #FF6D00', animation: 'logoBgPulse 1.8s infinite' }} />
                         <div style={{ width: 14, height: 14, background: 'var(--color-primary)', borderRadius: '50%', boxShadow: '0 4px 12px rgba(255,109,0,0.4)' }} />
                      </div>
                   </div>
                </div>
                {/* Detailed Recent Punches */}
                <div style={{ width: 320, flexShrink: 0, background: 'white', borderRadius: 20, border: '1px solid rgba(10,17,40,0.06)', padding: 24, display: 'flex', flexDirection: 'column', gap: 12, boxShadow: '0 12px 32px rgba(10,17,40,0.02)' }}>
                   <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 8, color: '#0B0F19' }}>Live Feed</div>
                   {[
                     { name: 'Rahul Sharma', time: '09:02 AM', status: 'Office HQ', color: '#FF6D00', initial: 'RS' },
                     { name: 'Priya Patel', time: '09:15 AM', status: 'Remote', color: '#FFA000', initial: 'PP' },
                     { name: 'Amit Kumar', time: '08:55 AM', status: 'Delhi Branch', color: '#FF8F00', initial: 'AK' },
                     { name: 'Neha Gupta', time: '09:30 AM', status: 'Mumbai Hub', color: '#E65100', initial: 'NG' },
                     { name: 'Arjun Mehta', time: '09:41 AM', status: 'Remote', color: '#D84315', initial: 'AM' }
                   ].map((p, i) => (
                     <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 12, transition: 'background 0.3s', cursor: 'pointer', background: i === 0 ? 'rgba(255,109,0,0.05)' : 'transparent' }}>
                        <div style={{ width: 36, height: 36, borderRadius: '50%', background: p.color, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 13, boxShadow: `0 4px 12px ${p.color}40`, flexShrink: 0 }}>
                          {p.initial}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 14, fontWeight: 700, color: '#0B0F19', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div>
                          <div style={{ fontSize: 12, color: 'rgba(10,17,40,0.6)', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.status}</div>
                        </div>
                        <div style={{ fontSize: 12, fontWeight: 800, color: '#0B0F19', background: 'rgba(255,109,0,0.04)', padding: '6px 10px', borderRadius: 8, flexShrink: 0 }}>{p.time}</div>
                     </div>
                   ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'py', color: 'var(--color-primary)', accent: 'rgba(255,109,0,0.1)',
      title: 'Statutory Payroll Engine',
      content: (
        <div style={{ display: 'flex', height: '100%', background: '#F8F9FA' }}>
          {/* Dashboard Sidebar - Premium White Theme */}
          <div style={{ width: 240, background: '#FFFFFF', padding: '28px 20px', display: 'flex', flexDirection: 'column', gap: 12, borderRight: '1px solid rgba(10,17,40,0.06)' }}>
             <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 32, paddingLeft: 8 }}>
                <img src="/logo.png" style={{ height: 64, width: 'auto', objectFit: 'contain' }} alt="Logo" />
             </div>
             <div style={{ background: 'linear-gradient(90deg, rgba(255,109,0,0.08) 0%, transparent 100%)', borderLeft: '3px solid #FF6D00', color: '#FF6D00', padding: '12px 16px', borderRadius: '0 8px 8px 0', fontWeight: 700, fontSize: 14 }}>Run Payroll</div>
             <div style={{ color: 'rgba(10,17,40,0.6)', padding: '10px 16px', fontWeight: 600, fontSize: 14 }}>Tax Declarations</div>
             <div style={{ color: 'rgba(10,17,40,0.6)', padding: '10px 16px', fontWeight: 600, fontSize: 14 }}>Compliance</div>
             
             {/* Simulated Mini Chart in Sidebar */}
             <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'flex-end', gap: 4, height: 40, padding: '0 16px', opacity: 0.5 }}>
               {[40, 70, 45, 90, 65, 100, 80].map((h, i) => (
                 <div key={i} style={{ flex: 1, height: `${h}%`, background: '#FF6D00', borderRadius: '4px 4px 0 0' }} />
               ))}
             </div>
          </div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <div style={{ height: 72, background: 'white', borderBottom: '1px solid rgba(10,17,40,0.06)', display: 'flex', alignItems: 'center', padding: '0 32px', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: 20, color: '#0B0F19' }}>Payroll Disbursal</div>
                <div style={{ fontSize: 13, color: 'rgba(10,17,40,0.5)', fontWeight: 600 }}>Cycle: November 2024</div>
              </div>
              <Button style={{ background: 'linear-gradient(135deg, #FF6D00, #FFA000)', color: 'white', border: 'none', fontWeight: 700, padding: '0 24px', height: 40, borderRadius: 8, boxShadow: '0 8px 16px rgba(255,109,0,0.25)' }}>Execute Run</Button>
            </div>
            <div style={{ padding: 32, flex: 1, display: 'flex', flexDirection: 'column', gap: 24 }}>
              {/* Premium Top Stats */}
              <div style={{ display: 'flex', gap: 24 }}>
                  <div style={{ flex: 1, background: 'white', padding: 24, borderRadius: 20, border: '1px solid rgba(10,17,40,0.06)', boxShadow: '0 12px 32px rgba(10,17,40,0.02)', position: 'relative', overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', top: -20, right: -20, width: 100, height: 100, background: 'rgba(255,109,0,0.03)', borderRadius: '50%' }} />
                    <div style={{ fontSize: 14, color: 'rgba(10,17,40,0.5)', fontWeight: 600, marginBottom: 8 }}>Total Gross Pay</div>
                    <div style={{ fontSize: 32, fontWeight: 900, color: '#FF6D00', letterSpacing: '-1px' }}>₹42.5L</div>
                  </div>
                  <div style={{ flex: 1, background: 'white', padding: 24, borderRadius: 20, border: '1px solid rgba(10,17,40,0.06)', boxShadow: '0 12px 32px rgba(10,17,40,0.02)', position: 'relative', overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', top: -20, right: -20, width: 100, height: 100, background: 'rgba(255,160,0,0.03)', borderRadius: '50%' }} />
                    <div style={{ fontSize: 14, color: 'rgba(10,17,40,0.5)', fontWeight: 600, marginBottom: 8 }}>Total Net Pay</div>
                    <div style={{ fontSize: 32, fontWeight: 900, color: '#FFA000', letterSpacing: '-1px' }}>₹32.8L</div>
                  </div>
                  <div style={{ flex: 1, background: 'white', padding: 24, borderRadius: 20, border: '1px solid rgba(10,17,40,0.06)', boxShadow: '0 12px 32px rgba(10,17,40,0.02)', position: 'relative', overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', top: -20, right: -20, width: 100, height: 100, background: 'rgba(255,59,48,0.03)', borderRadius: '50%' }} />
                    <div style={{ fontSize: 14, color: 'rgba(10,17,40,0.5)', fontWeight: 600, marginBottom: 8 }}>TDS & Statutory</div>
                    <div style={{ fontSize: 32, fontWeight: 900, color: '#D70015', letterSpacing: '-1px' }}>₹9.7L</div>
                  </div>
              </div>
              {/* Premium Table */}
              <div style={{ flex: 1, background: 'white', borderRadius: 20, border: '1px solid rgba(10,17,40,0.06)', padding: '24px 32px', boxShadow: '0 12px 32px rgba(10,17,40,0.02)' }}>
                 <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid rgba(10,17,40,0.04)', paddingBottom: 16, fontWeight: 700, color: 'rgba(10,17,40,0.4)', fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    <span style={{ width: '30%' }}>Employee</span>
                    <span style={{ width: '20%' }}>Gross</span>
                    <span style={{ width: '20%' }}>PF + ESI</span>
                    <span style={{ width: '15%' }}>TDS</span>
                    <span style={{ width: '15%', textAlign: 'right' }}>Net</span>
                 </div>
                 {[1, 2, 3].map(i => (
                   <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(10,17,40,0.03)', padding: '16px 0', transition: 'background 0.3s', cursor: 'pointer' }}>
                      <span style={{ width: '30%', display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 32, height: 32, borderRadius: 8, background: '#FFF3E0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 12, color: '#FF6D00' }}>#{800 + i}</div>
                        <span style={{ fontWeight: 700, color: '#0B0F19', fontSize: 15 }}>Dev Team {i}</span>
                      </span>
                      <span style={{ width: '20%', fontWeight: 600, color: 'rgba(10,17,40,0.7)' }}>₹ 85,000</span>
                      <span style={{ width: '20%', fontWeight: 600, color: '#FFA000' }}>₹ 4,200</span>
                      <span style={{ width: '15%', fontWeight: 600, color: '#D70015' }}>₹ 6,800</span>
                      <span style={{ width: '15%', fontWeight: 800, color: '#FF6D00', textAlign: 'right', fontSize: 16 }}>₹ 74,000</span>
                   </div>
                 ))}
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'ac', color: 'var(--color-primary)', accent: 'rgba(255,109,0,0.1)',
      title: 'GST Smart Ledger',
      content: (
        <div style={{ display: 'flex', height: '100%', background: '#F8F9FA' }}>
          {/* Dashboard Sidebar - Premium White Theme */}
          <div style={{ width: 240, background: '#FFFFFF', padding: '28px 20px', display: 'flex', flexDirection: 'column', gap: 12, borderRight: '1px solid rgba(10,17,40,0.06)' }}>
             <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 32, paddingLeft: 8 }}>
                <img src="/logo.png" style={{ height: 64, width: 'auto', objectFit: 'contain' }} alt="Logo" />
             </div>
             <div style={{ background: 'linear-gradient(90deg, rgba(255,109,0,0.08) 0%, transparent 100%)', borderLeft: '3px solid #FF6D00', color: '#FF6D00', padding: '12px 16px', borderRadius: '0 8px 8px 0', fontWeight: 700, fontSize: 14 }}>Invoices</div>
             <div style={{ color: 'rgba(10,17,40,0.6)', padding: '10px 16px', fontWeight: 600, fontSize: 14 }}>Bank Ledgers</div>
             <div style={{ color: 'rgba(10,17,40,0.6)', padding: '10px 16px', fontWeight: 600, fontSize: 14 }}>GSTR Reports</div>
          </div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <div style={{ height: 72, background: 'white', borderBottom: '1px solid rgba(10,17,40,0.06)', display: 'flex', alignItems: 'center', padding: '0 32px', justifyContent: 'space-between' }}>
              <div style={{ fontWeight: 800, fontSize: 20, color: '#0B0F19' }}>Invoice #INV-2024-892</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', background: 'linear-gradient(135deg, #FF6D00, #FFA000)', color: 'white', borderRadius: 8, fontWeight: 700, fontSize: 13, boxShadow: '0 4px 12px rgba(255,109,0,0.25)' }}>
                <span style={{ color: 'white' }}>✓</span> PAID VIA RAZORPAY
              </div>
            </div>
            <div style={{ padding: 40, flex: 1, display: 'flex', justifyContent: 'center', background: '#F0F2F5', overflowY: 'hidden' }}>
               {/* Extremely detailed Invoice Paper */}
               <div style={{ width: '100%', maxWidth: 640, background: 'white', borderRadius: 12, padding: 40, boxShadow: '0 24px 48px rgba(10,17,40,0.08), 0 0 0 1px rgba(10,17,40,0.03)', position: 'relative', overflow: 'hidden' }}>
                  {/* Watermark */}
                  <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%) rotate(-30deg)', fontSize: 120, fontWeight: 900, color: 'rgba(255,109,0,0.02)', pointerEvents: 'none', whiteSpace: 'nowrap' }}>SAPTTA</div>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 48, position: 'relative', zIndex: 2 }}>
                     <div>
                       <div style={{ fontSize: 28, fontWeight: 900, color: '#0B0F19', letterSpacing: '1px' }}>TAX INVOICE</div>
                       <div style={{ width: 40, height: 4, background: '#FF6D00', marginTop: 12, borderRadius: 2 }} />
                       <div style={{ color: 'rgba(10,17,40,0.6)', marginTop: 24, fontWeight: 600, fontSize: 14 }}>Billed to:</div>
                       <div style={{ color: '#0B0F19', fontWeight: 800, fontSize: 16 }}>TechCorp India Pvt Ltd</div>
                       <div style={{ color: 'rgba(10,17,40,0.6)', fontSize: 13, marginTop: 4 }}>GSTIN: 27AADCB2230M1Z2</div>
                     </div>
                     <div style={{ textAlign: 'right' }}>
                       {/* Simulated QR Code */}
                       <div style={{ width: 64, height: 64, background: 'linear-gradient(45deg, #000 25%, transparent 25%), linear-gradient(-45deg, #000 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #000 75%), linear-gradient(-45deg, transparent 75%, #000 75%)', backgroundSize: '8px 8px', backgroundPosition: '0 0, 0 4px, 4px -4px, -4px 0px', opacity: 0.8, marginLeft: 'auto', marginBottom: 16, borderRadius: 4 }} />
                       <div style={{ fontSize: 20, fontWeight: 800, color: '#0B0F19' }}>SAPTTA Systems</div>
                       <div style={{ color: 'rgba(10,17,40,0.6)', fontSize: 13, marginTop: 4 }}>GSTIN: 29GGGGG1314R9Z6</div>
                     </div>
                  </div>
                  <div style={{ borderTop: '2px solid #0B0F19', borderBottom: '1px solid rgba(10,17,40,0.1)', padding: '16px 0', display: 'flex', justifyContent: 'space-between', fontWeight: 800, color: '#0B0F19', fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                     <span>Item Description</span>
                     <span>Amount</span>
                  </div>
                  <div style={{ padding: '20px 0', display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(10,17,40,0.1)', color: '#0B0F19', fontSize: 15 }}>
                     <div>
                        <div style={{ fontWeight: 700 }}>Enterprise ERP License (1 Year)</div>
                        <div style={{ fontSize: 12, color: 'rgba(10,17,40,0.5)', marginTop: 4 }}>HSN 998314 • Digital Delivery</div>
                     </div>
                     <span style={{ fontWeight: 700 }}>₹ 75,000</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', paddingTop: 24, gap: 12 }}>
                     <div style={{ display: 'flex', justifyContent: 'space-between', width: 240, color: 'rgba(10,17,40,0.6)', fontSize: 14, fontWeight: 600 }}><span>CGST @ 9%</span><span>₹ 6,750</span></div>
                     <div style={{ display: 'flex', justifyContent: 'space-between', width: 240, color: 'rgba(10,17,40,0.6)', fontSize: 14, fontWeight: 600 }}><span>SGST @ 9%</span><span>₹ 6,750</span></div>
                     <div style={{ display: 'flex', justifyContent: 'space-between', width: 280, fontSize: 24, fontWeight: 900, borderTop: '2px dashed rgba(10,17,40,0.2)', paddingTop: 16, marginTop: 8, color: '#0B0F19' }}>
                       <span>Total</span><span style={{ color: '#FF6D00' }}>₹ 88,500</span>
                     </div>
                  </div>
               </div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'ai', color: 'var(--color-primary)', accent: 'rgba(255,109,0,0.1)',
      title: 'Claude AI Auditing',
      content: (
        <div style={{ display: 'flex', height: '100%', background: '#F8F9FA' }}>
          {/* Dashboard Sidebar - Premium White Theme */}
          <div style={{ width: 240, background: '#FFFFFF', padding: '28px 20px', display: 'flex', flexDirection: 'column', gap: 12, borderRight: '1px solid rgba(10,17,40,0.06)' }}>
             <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 32, paddingLeft: 8 }}>
                <img src="/logo.png" style={{ height: 64, width: 'auto', objectFit: 'contain' }} alt="Logo" />
             </div>
             <div style={{ background: 'linear-gradient(90deg, rgba(255,109,0,0.08) 0%, transparent 100%)', borderLeft: '3px solid #FF6D00', color: '#FF6D00', padding: '12px 16px', borderRadius: '0 8px 8px 0', fontWeight: 700, fontSize: 14 }}>Audit Assistant</div>
             <div style={{ color: 'rgba(10,17,40,0.6)', padding: '10px 16px', fontWeight: 600, fontSize: 14 }}>Chat Support</div>
             
             {/* Decorative UI elements for AI */}
             <div style={{ marginTop: 'auto', display: 'flex', gap: 6, paddingLeft: 16 }}>
               <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#FF6D00', animation: 'logoBgPulse 1.5s infinite' }} />
               <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#FF6D00', animation: 'logoBgPulse 1.5s infinite 0.2s' }} />
               <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#FF6D00', animation: 'logoBgPulse 1.5s infinite 0.4s' }} />
             </div>
          </div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--color-bg-base)' }}>
            <div style={{ height: 72, background: 'white', borderBottom: '1px solid rgba(10,17,40,0.06)', display: 'flex', alignItems: 'center', padding: '0 32px', justifyContent: 'space-between', boxShadow: '0 4px 20px rgba(0,0,0,0.02)', zIndex: 10 }}>
              <div style={{ fontWeight: 800, fontSize: 20, color: '#0B0F19' }}>Audit Assistant</div>
              <div style={{ fontSize: 13, background: 'rgba(255,109,0,0.05)', padding: '8px 16px', borderRadius: 20, fontWeight: 700, color: '#FF6D00', border: '1px solid rgba(255,109,0,0.2)' }}>Powered by Claude 3.5</div>
            </div>
            <div style={{ padding: '32px 40px', flex: 1, display: 'flex', flexDirection: 'column', gap: 24, overflow: 'hidden' }}>
              {/* User Bubble */}
              <div style={{ alignSelf: 'flex-end', background: 'linear-gradient(135deg, #0B0F19, #1A202C)', color: 'white', padding: '18px 24px', borderRadius: '24px 24px 4px 24px', maxWidth: '75%', fontSize: 15, lineHeight: 1.6, boxShadow: '0 12px 24px rgba(10,17,40,0.15)' }}>
                Please run a full compliance audit on the November Payroll run before I execute the disbursal.
              </div>
              {/* AI Bubble */}
              <div style={{ alignSelf: 'flex-start', background: 'white', border: '1px solid rgba(10,17,40,0.08)', padding: '24px', borderRadius: '24px 24px 24px 4px', maxWidth: '85%', fontSize: 15, lineHeight: 1.6, boxShadow: '0 20px 40px rgba(10,17,40,0.04)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, color: '#FF6D00', fontWeight: 800, fontSize: 16 }}>
                  <div style={{ width: 24, height: 24, background: 'linear-gradient(135deg, #FF6D00, #FFA000)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 12 }}>✦</div> 
                  Analysis Complete
                </div>
                <strong style={{ color: '#0B0F19', fontSize: 16 }}>I found 3 items requiring your attention:</strong>
                <ul style={{ margin: '16px 0 0 24px', padding: 0, color: 'rgba(10,17,40,0.7)', display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <li style={{ position: 'relative' }}>
                    <span style={{ color: '#0B0F19', fontWeight: 700 }}>Missing Punches:</span> Employee #802 is missing 2 biometric punches. <br/>
                    <span style={{ color: 'var(--color-primary)', fontSize: 13, fontWeight: 700 }}>↳ Action: Recommend reverting 1 leave day.</span>
                  </li>
                  <li>
                    <span style={{ color: '#0B0F19', fontWeight: 700 }}>Tax Update:</span> Professional Tax deduction for Karnataka branch needs an update (Slab revised).
                  </li>
                  <li style={{ color: '#FF6D00', fontWeight: 600 }}>
                    ESI & PF computations perfectly match statutory limits. ✓
                  </li>
                </ul>
                <div style={{ marginTop: 24, display: 'flex', gap: 16, borderTop: '1px solid rgba(10,17,40,0.06)', paddingTop: 20 }}>
                  <Button style={{ background: '#FF6D00', color: 'white', border: 'none', fontWeight: 700, padding: '0 24px', height: 44, borderRadius: 8, boxShadow: '0 8px 16px rgba(255,109,0,0.25)' }}>Apply Auto-Fixes</Button>
                  <Button style={{ background: '#F8F9FA', color: '#0B0F19', border: '1px solid rgba(10,17,40,0.1)', fontWeight: 600, padding: '0 24px', height: 44, borderRadius: 8 }}>View Detailed Report</Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )
    }
  ];

  const [isMobile, setIsMobile] = useState(window.innerWidth < 992);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 992);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <section className="responsive-padding" style={{
      minHeight: '92vh', display: 'flex', flexDirection: 'column', alignItems: 'center',
      padding: isMobile ? '60px 24px 40px' : '100px 24px 80px', position: 'relative', overflow: 'hidden',
      borderBottom: '1px solid #EAECEF', background: 'var(--color-bg-base)',
      justifyContent: 'center'
    }}>
      {/* Background Ambience */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', display: 'flex', justifyContent: 'center', overflow: 'hidden' }}>
        <div style={{ width: 1000, height: 1000, top: -500, position: 'absolute', background: 'radial-gradient(circle, var(--color-primary) 0%, transparent 70%)', filter: 'blur(120px)', opacity: 0.15, animation: 'glowPulse 6s infinite alternate' }} />
        <div style={{ width: 800, height: 800, top: 100, right: -300, position: 'absolute', background: 'radial-gradient(circle, var(--color-secondary) 0%, transparent 70%)', filter: 'blur(120px)', opacity: 0.1 }} />
        <div style={{ position: 'absolute', inset: 0, backgroundImage: `radial-gradient(circle at 1px 1px, var(--color-text-primary) 1px, transparent 0)`, backgroundSize: '40px 40px', opacity: 0.05 }} />
      </div>

      {/* Hero Flex Split Layout Container */}
      <div style={{
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: isMobile ? 48 : 64,
        width: '100%',
        maxWidth: 1320,
        margin: '0 auto',
        position: 'relative',
        zIndex: 10,
      }}>
        {/* Left Column: Heading and CTAs */}
        <div style={{
          flex: 1,
          maxWidth: isMobile ? 640 : 620,
          textAlign: isMobile ? 'center' : 'left',
          display: 'flex',
          flexDirection: 'column',
          alignItems: isMobile ? 'center' : 'flex-start',
        }}>
          <ScrollReveal animation="fade-in-up">
            <h1 style={{
              fontSize: 'clamp(2.2rem, 4vw, 3.5rem)',
              fontWeight: 800, lineHeight: 1.15,
              color: 'var(--color-text-primary)', marginBottom: 24,
              letterSpacing: '-1.5px',
            }}>
              The Complete Operating System <br />
              for People & Finance.
            </h1>
          </ScrollReveal>
          
          <ScrollReveal animation="fade-in-up" delay={200}>
            <p style={{ 
              fontSize: '1.2rem', 
              color: 'var(--color-text-secondary)', 
              marginBottom: 40, 
              lineHeight: 1.6, 
              maxWidth: 580 
            }}>
              Stop stitching together isolated HR plugins and billing sheets. SAPTTA combines modular compliance payroll, smart attendance systems, and automated GST billing into a beautiful corporate cockpit.
            </p>
          </ScrollReveal>

          <ScrollReveal animation="fade-in-up" delay={300}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, justifyContent: isMobile ? 'center' : 'flex-start' }}>
              <Button size="large" style={{
                background: 'var(--color-primary)', border: 'none', color: 'white', fontWeight: 700,
                height: 56, padding: '0 44px', borderRadius: 12, fontSize: 16,
                boxShadow: '0 12px 32px rgba(255, 109, 0, 0.3)', transition: 'all 0.3s cubic-bezier(0.16,1,0.3,1)',
              }} onClick={() => navigate('/pricing')} 
                 onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 16px 40px rgba(255, 109, 0, 0.4)'; e.currentTarget.style.background = 'var(--color-primary-hover)'; }}
                 onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 12px 32px rgba(255, 109, 0, 0.3)'; e.currentTarget.style.background = 'var(--color-primary)'; }}>
                View Pricing
              </Button>
              <Button size="large" style={{
                background: '#F8F9FA', border: '1px solid rgba(10,17,40,0.12)', color: 'var(--color-text-primary)', fontWeight: 700,
                height: 56, padding: '0 38px', borderRadius: 12, fontSize: 16,
              }} onClick={() => navigate('/contact')}>
                Book a Demo
              </Button>
            </div>
          </ScrollReveal>
          <ScrollReveal animation="fade-in-up" delay={350}>
            <div style={{ marginTop: 24, maxWidth: 580, textAlign: isMobile ? 'center' : 'left' }}>
              <p style={{ color: 'var(--color-text-secondary)', fontSize: 15, lineHeight: 1.8, margin: 0 }}>
                Choose HRMS, Finance, or both — each product is separately licensed and can be activated independently. Upgrade to <strong>Saptta Complete</strong> when you want a unified HR + Finance experience.
              </p>
            </div>
          </ScrollReveal>
        </div>

        {/* Right Column: Image-1 card grid */}
        <div style={{
          flex: 1.2,
          width: '100%',
          maxWidth: isMobile ? 640 : 'none',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
        }}>
          <ScrollReveal animation="fade-in-up" delay={400} style={{ width: '100%', display: 'block' }}>

            {/* Non-overlapping scattered layout */}
            <div style={isMobile ? {
              display: 'flex',
              flexWrap: 'wrap',
              gap: 16,
              width: '100%',
              justifyContent: 'center',
              padding: '20px 4px'
            } : {
              position: 'relative',
              width: '100%',
              height: 600,
            }}>
              {[
                { src: '/uploaded_cards/img1.png', top: '2%', left: '4%', width: '26%', rotate: '-3deg' },
                { src: '/uploaded_cards/img2.png', top: '6%', left: '70%', width: '24%', rotate: '4deg' },
                { src: '/uploaded_cards/img3.png', top: '30%', left: '32%', width: '36%', rotate: '-1deg' },
                { src: '/uploaded_cards/img4.png', top: '60%', left: '2%', width: '38%', rotate: '2deg' },
                { src: '/uploaded_cards/img5.png', top: '56%', left: '55%', width: '38%', rotate: '-2deg' },
              ].map((card, i) => (
                <div key={i} className="card-hover" style={isMobile ? {
                  width: '90%',
                  background: 'transparent',
                  borderRadius: 12,
                  border: '1px solid rgba(10,17,40,0.08)',
                  boxShadow: '0 4px 14px rgba(0,0,0,0.05)',
                  overflow: 'hidden'
                } : {
                  position: 'absolute',
                  top: card.top,
                  left: card.left,
                  width: card.width,
                  transform: `rotate(${card.rotate})`,
                  background: 'transparent',
                  borderRadius: 12,
                  border: '1px solid rgba(10,17,40,0.08)',
                  boxShadow: '0 6px 20px rgba(0,0,0,0.06)',
                  overflow: 'hidden',
                  transition: 'transform 0.3s ease, box-shadow 0.3s ease'
                }}>
                  <img src={card.src} alt={`Card ${i+1}`} style={{ width: '100%', height: 'auto', display: 'block', borderRadius: 12 }} />
                </div>
              ))}
            </div>
          </ScrollReveal>
        </div>
      </div>
    </section>
  );
}

export default function Home() {
  const navigate = useNavigate();
  const heroRef = useRef<HTMLDivElement>(null);

  const [isMobile, setIsMobile] = useState(window.innerWidth < 992);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 992);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  /* Interactive Sandbox States */
  const [punched, setPunched] = useState(false);
  const [rippling, setRippling] = useState(false);
  const [activeFeatureTab, setActiveFeatureTab] = useState(0);
  
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const isProgrammaticScroll = useRef(false);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (container) {
      isProgrammaticScroll.current = true;
      const slideWidth = container.clientWidth;
      container.scrollTo({
        left: activeFeatureTab * slideWidth,
        behavior: 'smooth'
      });
      const timer = setTimeout(() => {
        isProgrammaticScroll.current = false;
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [activeFeatureTab]);

  const handleScroll = () => {
    if (isProgrammaticScroll.current) return;
    const container = scrollContainerRef.current;
    if (container) {
      const scrollLeft = container.scrollLeft;
      const slideWidth = container.clientWidth || 1;
      const index = Math.round(scrollLeft / slideWidth);
      if (index >= 0 && index < 4 && index !== activeFeatureTab) {
        setActiveFeatureTab(index);
      }
    }
  };

  /* Auto-play slideshow cockpit rotation loop with interaction reset */
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveFeatureTab(prev => (prev + 1) % 4);
    }, 6000); // cycle slides every 6 seconds

    return () => clearInterval(timer);
  }, [activeFeatureTab]);

  const [employeeCount, setEmployeeCount] = useState(65);
  const [calcPopKey, setCalcPopKey] = useState(0);

  const [chatState, setChatState] = useState<'idle' | 'typing-user' | 'show-user' | 'typing-claude' | 'show-claude'>('idle');

  /* Scroll Parallax */
  useEffect(() => {
    const onScroll = () => {
      if (heroRef.current) {
        heroRef.current.style.transform = `translateY(${window.scrollY * 0.15}px)`;
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  /* Claude Simulated Dialogue Sequence Loop */
  useEffect(() => {
    let active = true;
    const runChatLoop = () => {
      if (!active) return;
      setChatState('idle');
      
      setTimeout(() => { if (active) setChatState('typing-user'); }, 1000);
      setTimeout(() => { if (active) setChatState('show-user'); }, 3000);
      setTimeout(() => { if (active) setChatState('typing-claude'); }, 4800);
      setTimeout(() => { if (active) setChatState('show-claude'); }, 7800);
      
      // repeats every 15 seconds
      setTimeout(() => {
        if (active) runChatLoop();
      }, 15000);
    };

    runChatLoop();
    return () => { active = false; };
  }, []);

  const handlePunchClick = () => {
    setRippling(true);
    setPunched(!punched);
    setTimeout(() => setRippling(false), 900);
  };

  return (
    <div style={{ overflow: 'hidden', background: 'var(--color-bg-base)' }}>
      {/* ── 1. Centered Hero Carousel ── */}
      <HeroCarousel />

      {/* ── Grayscale Partner Logo Trust Bar ── */}
      <section style={{ 
        background: 'var(--color-bg-base)', 
        padding: '36px 24px', 
        borderBottom: '1px solid rgba(10,17,40,0.06)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        zIndex: 5
      }}>
        <div style={{ maxWidth: 1320, width: '100%', margin: '0 auto', textAlign: 'center' }}>
          <p style={{ 
            fontSize: '11px', 
            textTransform: 'uppercase', 
            letterSpacing: '2.5px', 
            color: 'rgba(10, 17, 40, 0.45)', 
            fontWeight: 700, 
            marginBottom: '24px' 
          }}>
            Trusted Integrations & Enterprise Compliance Standards
          </p>
          <div style={{ 
            display: 'flex', 
            flexWrap: 'wrap', 
            justifyContent: 'center', 
            alignItems: 'center', 
            gap: '32px 56px' 
          }}>
            {[
              { name: 'Razorpay Secure', label: 'Razorpay Secure' },
              { name: 'AWS Secure', label: 'AWS Cloud SEC' },
              { name: 'ZKTeco Biometrics', label: 'ZKTeco Biometrics' },
              { name: 'ICICI Bank Link', label: 'ICICI Bank API' },
              { name: 'MCA Compliance', label: 'MCA Compliant' }
            ].map(partner => (
              <div 
                key={partner.name} 
                className="partner-logo"
                style={{ 
                  fontWeight: 700, 
                  fontSize: '15px', 
                  color: 'rgba(10, 17, 40, 0.42)', 
                  letterSpacing: '-0.5px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  cursor: 'default',
                  transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                }}
              >
                <div style={{ 
                  width: '6px', 
                  height: '6px', 
                  borderRadius: '50%', 
                  background: 'rgba(10, 17, 40, 0.3)',
                  transition: 'all 0.3s ease'
                }} className="partner-dot" />
                <span>{partner.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="responsive-padding" style={{ background: '#FFFFFF', padding: '80px 24px', borderBottom: '1px solid #EAECEF' }}>
        <div style={{ maxWidth: 1320, margin: '0 auto' }}>
          <ScrollReveal animation="fade-in-up">
            <div style={{ textAlign: 'center', maxWidth: 760, margin: '0 auto 40px' }}>
              <div style={{ textTransform: 'uppercase', color: 'var(--color-primary)', fontSize: 12, fontWeight: 800, letterSpacing: '0.25em', marginBottom: 12 }}>MODULAR SAAS</div>
              <h2 style={{ fontSize: isMobile ? '2rem' : '2.8rem', fontWeight: 800, color: 'var(--color-text-primary)', marginBottom: 18, lineHeight: 1.15 }}>
                HRMS and Finance are separate products.
              </h2>
              <p style={{ color: 'var(--color-text-secondary)', fontSize: 16, lineHeight: 1.8 }}>
                Start with HRMS for people operations or Finance for accounting and GST. Add the other product later, or choose Saptta Complete for a fully unified HR + Finance platform.
              </p>
            </div>
          </ScrollReveal>

          <div style={{ display: 'grid', gap: 20, gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' }}>
            {[
              {
                title: 'HRMS',
                description: 'Attendance, payroll, recruitment, performance and employee engagement in one product.',
                button: 'View HRMS',
                path: '/hrms',
                color: '#FF6D00',
              },
              {
                title: 'Finance',
                description: 'GST invoicing, ledgers, purchase management, reconciliation and statutory reporting.',
                button: 'View Accounts',
                path: '/accounts',
                color: '#0B72FF',
              },
              {
                title: 'Saptta Complete',
                description: 'Unified HR + Finance workflows with payroll-ledger posting and consolidated analytics.',
                button: 'See Bundle',
                path: '/pricing',
                color: '#10B981',
              },
            ].map((item, index) => (
              <ScrollReveal key={item.title} animation="fade-in-up" delay={index * 120}>
                <div style={{
                  background: 'var(--color-bg-base)',
                  borderRadius: 24,
                  border: '1px solid rgba(10,17,40,0.08)',
                  padding: '28px 24px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 20,
                  minHeight: 260,
                  boxShadow: '0 16px 40px rgba(10,17,40,0.05)',
                }}>
                  <div>
                    <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 42, height: 42, borderRadius: 14, background: item.color + '22', color: item.color, fontWeight: 700, marginBottom: 18, fontSize: 18 }}>
                      {item.title[0]}
                    </div>
                    <h3 style={{ fontSize: 22, fontWeight: 800, marginBottom: 12, color: 'var(--color-text-primary)' }}>{item.title}</h3>
                    <p style={{ color: 'var(--color-text-secondary)', fontSize: 15, lineHeight: 1.7, margin: 0 }}>{item.description}</p>
                  </div>
                  <Button
                    type="default"
                    style={{
                      marginTop: 'auto',
                      background: item.color,
                      color: 'white',
                      border: 'none',
                      fontWeight: 700,
                      height: 50,
                      borderRadius: 14,
                    }}
                    onClick={() => navigate(item.path)}
                  >
                    {item.button}
                  </Button>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── 2. Unified Product Cockpit Showcase Section ── */}
      <section className="responsive-padding" style={{ background: 'var(--color-bg-base)', padding: '100px 24px', borderBottom: '1px solid #EAECEF', position: 'relative' }}>
        <div style={{ maxWidth: 1320, margin: '0 auto' }}>
          
          {/* Main Cockpit Section Header */}
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <ScrollReveal animation="fade-in-down">
              <h2 style={{ 
                fontSize: isMobile ? '2rem' : '2.8rem', 
                fontWeight: 500, 
                color: 'var(--color-text-primary)', 
                marginBottom: 20, 
                letterSpacing: '-1.5px', 
                lineHeight: 1.2 
              }}>
                The Complete Operating System for People & Finance
              </h2>
              <p style={{ 
                color: 'var(--color-text-secondary)', 
                lineHeight: 1.8, 
                fontSize: 16, 
                maxWidth: 800, 
                margin: '0 auto' 
              }}>
                Stop stitching together isolated HR plugins and billing sheets. SAPTTA combines modular compliance payroll, smart attendance systems, and automated GST billing into a beautiful corporate cockpit.
              </p>
            </ScrollReveal>
          </div>

          {/* Switcher Tab Pills Controller */}
          <ScrollReveal animation="fade-in-up">
            <div style={{ 
              display: 'flex', 
              justifyContent: 'center', 
              marginBottom: 48,
              width: '100%'
            }}>
              <div style={{ 
                display: 'flex', 
                flexWrap: 'wrap', 
                gap: 8, 
                background: 'rgba(10, 17, 40, 0.03)', 
                padding: 6, 
                borderRadius: 16,
                border: '1px solid rgba(10, 17, 40, 0.05)',
                justifyContent: 'center',
                maxWidth: '100%'
              }}>
                {[
                  { id: 0, label: 'Core HRMS & Attendance', color: 'var(--color-primary)' },
                  { id: 1, label: 'Statutory Payroll', color: 'var(--color-secondary)' },
                  { id: 2, label: 'GST Invoicing', color: 'var(--color-success)' },
                  { id: 3, label: 'Claude AI Auditor', color: 'var(--color-primary)' }
                ].map(tab => {
                  const isActive = activeFeatureTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveFeatureTab(tab.id)}
                      style={{
                        padding: '10px 20px',
                        borderRadius: 12,
                        border: 'none',
                        background: isActive ? '#FF6D00' : 'transparent',
                        color: isActive ? '#FFFFFF' : 'var(--color-text-secondary)',
                        fontSize: 14.5,
                        fontWeight: 500,
                        cursor: 'pointer',
                        transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        boxShadow: isActive ? '0 8px 16px rgba(255, 109, 0, 0.2)' : 'none'
                      }}
                      onMouseEnter={e => {
                        if (!isActive) {
                          e.currentTarget.style.background = 'rgba(10, 17, 40, 0.05)';
                          e.currentTarget.style.color = 'var(--color-text-primary)';
                        }
                      }}
                      onMouseLeave={e => {
                        if (!isActive) {
                          e.currentTarget.style.background = 'transparent';
                          e.currentTarget.style.color = 'var(--color-text-secondary)';
                        }
                      }}
                    >
                      <span style={{ 
                        width: 6, 
                        height: 6, 
                        borderRadius: '50%', 
                        background: isActive ? '#FFFFFF' : tab.color,
                        display: 'inline-block' 
                      }} />
                      {tab.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </ScrollReveal>

          {/* Active Product Showcase Horizontally Scrollable Layout (Side-by-Side Snapping) */}
          <div 
            ref={scrollContainerRef}
            onScroll={handleScroll}
            className="no-scrollbar"
            style={{ 
              display: 'flex',
              overflowX: 'auto',
              scrollSnapType: 'x mandatory',
              scrollBehavior: 'smooth',
              width: '100%',
              gap: 0,
              padding: '24px 0'
            }}
          >
            {/* Slide 0: Core HRMS & Attendance */}
            <div style={{ flex: '0 0 100%', width: '100%', padding: isMobile ? '0 16px' : '0 48px', boxSizing: 'border-box', scrollSnapAlign: 'start', scrollSnapStop: 'always' }} key="hrms-tab">
              <Row gutter={isMobile ? [16, 24] : [48, 48]} align="middle">
                {/* Description */}
                <Col xs={24} lg={11}>
                  <ScrollReveal animation="fade-in-left">
                    <h3 style={{ fontSize: '2rem', fontWeight: 500, color: 'var(--color-text-primary)', marginBottom: 20, letterSpacing: '-1px', lineHeight: 1.2 }}>
                      Core HRMS & Geofence Attendance
                    </h3>
                    <p style={{ color: 'var(--color-text-secondary)', lineHeight: 1.8, fontSize: 15, marginBottom: 32 }}>
                      Deploy smart whitelisted geofencing parameters for your distributed operations teams. Employees check-in securely using mobile biometrics and verified GPS geolocators directly from our application.
                    </p>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 32 }}>
                      {[
                        'Smart whitelisted GPS bounds & geofences',
                        'Fingerprint & face recognition authentication',
                        'Real-time employee movement mapping',
                        'Seamless leave & duty logs synchronization'
                      ].map(item => (
                        <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 20, height: 20, borderRadius: '50%', background: 'rgba(255,109,0,0.1)', color: 'var(--color-primary)', fontSize: 12, fontWeight: 500 }}>✓</div>
                          <span style={{ fontSize: 14.5, color: 'var(--color-text-secondary)' }}>{item}</span>
                        </div>
                      ))}
                    </div>

                    <Button type="link" onClick={() => navigate('/hrms')} style={{ color: 'var(--color-primary)', padding: 0, fontWeight: 500, fontSize: 15, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      Explore HRMS Architecture Panel <span style={{ transition: 'transform 0.2s' }} className="arrow-hover">→</span>
                    </Button>
                  </ScrollReveal>
                </Col>

                {/* HRMS Dashboard Visual Showcase */}
                <Col xs={24} lg={13}>
                  <ScrollReveal animation="fade-in-right">
                    <div style={{
                      position: 'relative',
                      width: '100%',
                      padding: isMobile ? '20px 12px' : '20px 40px 20px 20px',
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center'
                    }}>
                      {/* Glass Card Image Panel */}
                      <div style={{
                        position: 'relative',
                        zIndex: 2,
                        background: 'rgba(255, 255, 255, 0.6)',
                        backdropFilter: 'blur(20px)',
                        borderRadius: 24,
                        padding: 12,
                        border: '1px solid rgba(255, 255, 255, 0.4)',
                        boxShadow: '0 30px 60px rgba(10, 17, 40, 0.06), 0 0 0 1px rgba(10, 17, 40, 0.02)',
                        transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
                        cursor: 'pointer',
                        overflow: 'hidden',
                        width: '100%'
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.transform = 'translateY(-6px) scale(1.01)';
                        e.currentTarget.style.boxShadow = '0 40px 80px rgba(10, 17, 40, 0.1)';
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.transform = 'translateY(0) scale(1)';
                        e.currentTarget.style.boxShadow = '0 30px 60px rgba(10, 17, 40, 0.06), 0 0 0 1px rgba(10, 17, 40, 0.02)';
                      }}>
                        {/* Morphing Organic Glow */}
                        <div className="morphing-blob" style={{
                          position: 'absolute',
                          width: '120%',
                          height: '120%',
                          top: '-10%',
                          left: '-10%',
                          background: 'radial-gradient(circle, rgba(255,109,0,0.12) 0%, transparent 70%)',
                          filter: 'blur(45px)',
                          zIndex: 1,
                          pointerEvents: 'none'
                        }} />
                        <img 
                          src="/hrms-dashboard.png" 
                          alt="Saptta HRMS Core Cockpit" 
                          style={{
                            width: '100%',
                            height: 'auto',
                            borderRadius: 16,
                            display: 'block',
                            boxShadow: '0 4px 16px rgba(0,0,0,0.04)',
                            position: 'relative',
                            zIndex: 2
                          }} 
                        />
                      </div>

                      {/* Floating Glassmorphism Badge 1 */}
                      <div className="floating-widget-hover" style={{
                        position: 'absolute',
                        top: '12%',
                        left: isMobile ? '4px' : '-24px',
                        zIndex: 3,
                        background: 'rgba(255, 255, 255, 0.85)',
                        backdropFilter: 'blur(10px)',
                        borderRadius: 16,
                        padding: isMobile ? '8px 12px' : '14px 22px',
                        border: '1px solid rgba(255, 255, 255, 0.5)',
                        boxShadow: '0 20px 40px rgba(10, 17, 40, 0.06)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                      }}>
                        <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--color-primary)' }} />
                        <div>
                          <div style={{ fontSize: isMobile ? 9 : 10, color: 'var(--color-text-secondary)', fontWeight: 500 }}>Active Hubs</div>
                          <div style={{ fontSize: isMobile ? 12 : 14, fontWeight: 500, color: 'var(--color-text-primary)' }}>42 Geofences</div>
                        </div>
                      </div>

                      {/* Floating Glassmorphism Badge 2 */}
                      <div className="floating-widget-hover" style={{
                        position: 'absolute',
                        bottom: '12%',
                        right: isMobile ? '4px' : '-24px',
                        zIndex: 3,
                        background: 'rgba(255, 255, 255, 0.85)',
                        backdropFilter: 'blur(10px)',
                        borderRadius: 16,
                        padding: isMobile ? '8px 12px' : '14px 22px',
                        border: '1px solid rgba(255, 255, 255, 0.5)',
                        boxShadow: '0 20px 40px rgba(10, 17, 40, 0.06)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                      }}>
                        <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#00C853' }} />
                        <div>
                          <div style={{ fontSize: isMobile ? 9 : 10, color: 'var(--color-text-secondary)', fontWeight: 500 }}>Live Punch-Ins</div>
                          <div style={{ fontSize: isMobile ? 12 : 14, fontWeight: 500, color: 'var(--color-text-primary)' }}>1,492 Agents</div>
                        </div>
                      </div>

                      {/* Floating Glassmorphism Badge 3 */}
                      <div className="floating-widget-hover" style={{
                        position: 'absolute',
                        top: '45%',
                        right: isMobile ? '4px' : '-36px',
                        zIndex: 3,
                        background: 'rgba(255, 255, 255, 0.85)',
                        backdropFilter: 'blur(10px)',
                        borderRadius: 16,
                        padding: isMobile ? '8px 12px' : '14px 22px',
                        border: '1px solid rgba(255, 255, 255, 0.5)',
                        boxShadow: '0 20px 40px rgba(10, 17, 40, 0.06)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                      }}>
                        <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#FF9800' }} />
                        <div>
                          <div style={{ fontSize: isMobile ? 9 : 10, color: 'var(--color-text-secondary)', fontWeight: 500 }}>GPS Accuracy</div>
                          <div style={{ fontSize: isMobile ? 12 : 14, fontWeight: 500, color: 'var(--color-text-primary)' }}>99.8% Whitelisted</div>
                        </div>
                      </div>
                    </div>
                  </ScrollReveal>
                </Col>
              </Row>
            </div>

            {/* Slide 1: Statutory Payroll */}
            <div style={{ flex: '0 0 100%', width: '100%', padding: isMobile ? '0 16px' : '0 48px', boxSizing: 'border-box', scrollSnapAlign: 'start', scrollSnapStop: 'always' }} key="payroll-tab">
              <Row gutter={isMobile ? [16, 24] : [48, 48]} align="middle">
                {/* Description */}
                <Col xs={24} lg={11}>
                  <ScrollReveal animation="fade-in-left">
                    <h3 style={{ fontSize: '2rem', fontWeight: 500, color: 'var(--color-text-primary)', marginBottom: 20, letterSpacing: '-1px', lineHeight: 1.2 }}>
                      AI Payroll & Statutory Compliance
                    </h3>
                    <p style={{ color: 'var(--color-text-secondary)', lineHeight: 1.8, fontSize: 15, marginBottom: 32 }}>
                      Generate customized salary structures and process payroll runs in three clicks. SAPTTA natively incorporates ESI, PF, TDS calculations, and professional tax rules for Indian operations, ensuring zero discrepancies.
                    </p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 32 }}>
                      {[
                        'Automated ESI, PF, and TDS processing',
                        'One-click direct bank disbursements support',
                        'Customizable salary components & rules',
                        'Fully secure compliance report compile'
                      ].map(item => (
                        <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 20, height: 20, borderRadius: '50%', background: 'rgba(138,43,226,0.1)', color: 'var(--color-secondary)', fontSize: 12, fontWeight: 700 }}>✓</div>
                          <span style={{ fontSize: 14.5, color: 'var(--color-text-secondary)' }}>{item}</span>
                        </div>
                      ))}
                    </div>

                    <Button type="link" onClick={() => navigate('/hrms')} style={{ color: 'var(--color-secondary)', padding: 0, fontWeight: 500, fontSize: 15, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      Explore Compliance Payroll Panel <span style={{ transition: 'transform 0.2s' }} className="arrow-hover">→</span>
                    </Button>
                  </ScrollReveal>
                </Col>

                {/* Payroll Dashboard Visual Showcase */}
                <Col xs={24} lg={13}>
                  <ScrollReveal animation="fade-in-right">
                    <div style={{
                      position: 'relative',
                      width: '100%',
                      padding: isMobile ? '20px 12px' : '20px 40px 20px 20px',
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center'
                    }}>
                      {/* Glass Card Image Panel */}
                      <div style={{
                        position: 'relative',
                        zIndex: 2,
                        background: 'rgba(255, 255, 255, 0.6)',
                        backdropFilter: 'blur(20px)',
                        borderRadius: 24,
                        padding: 12,
                        border: '1px solid rgba(255, 255, 255, 0.4)',
                        boxShadow: '0 30px 60px rgba(10, 17, 40, 0.06), 0 0 0 1px rgba(10, 17, 40, 0.02)',
                        transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
                        cursor: 'pointer',
                        overflow: 'hidden',
                        width: '100%'
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.transform = 'translateY(-6px) scale(1.01)';
                        e.currentTarget.style.boxShadow = '0 40px 80px rgba(10, 17, 40, 0.1)';
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.transform = 'translateY(0) scale(1)';
                        e.currentTarget.style.boxShadow = '0 30px 60px rgba(10, 17, 40, 0.06), 0 0 0 1px rgba(10, 17, 40, 0.02)';
                      }}>
                        {/* Morphing Organic Glow */}
                        <div className="morphing-blob" style={{
                          position: 'absolute',
                          width: '120%',
                          height: '120%',
                          top: '-10%',
                          left: '-10%',
                          background: 'radial-gradient(circle, rgba(138,43,226,0.12) 0%, transparent 70%)',
                          filter: 'blur(45px)',
                          zIndex: 1,
                          pointerEvents: 'none'
                        }} />
                        <img 
                          src="/payroll-dashboard.png" 
                          alt="Saptta Payroll & Statutory Cockpit" 
                          style={{
                            width: '100%',
                            height: 'auto',
                            borderRadius: 16,
                            display: 'block',
                            boxShadow: '0 4px 16px rgba(0,0,0,0.04)',
                            position: 'relative',
                            zIndex: 2
                          }} 
                        />
                      </div>

                      {/* Floating Glassmorphism Badge 1 */}
                      <div className="floating-widget-hover" style={{
                        position: 'absolute',
                        top: '12%',
                        right: isMobile ? '4px' : '-24px',
                        zIndex: 3,
                        background: 'rgba(255, 255, 255, 0.85)',
                        backdropFilter: 'blur(10px)',
                        borderRadius: 16,
                        padding: isMobile ? '8px 12px' : '14px 22px',
                        border: '1px solid rgba(255, 255, 255, 0.5)',
                        boxShadow: '0 20px 40px rgba(10, 17, 40, 0.06)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                      }}>
                        <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#00C853' }} />
                        <div>
                          <div style={{ fontSize: isMobile ? 9 : 10, color: 'var(--color-text-secondary)', fontWeight: 500 }}>Compliance PF/ESI</div>
                          <div style={{ fontSize: isMobile ? 12 : 14, fontWeight: 500, color: 'var(--color-text-primary)' }}>100% Matched</div>
                        </div>
                      </div>

                      {/* Floating Glassmorphism Badge 2 */}
                      <div className="floating-widget-hover" style={{
                        position: 'absolute',
                        bottom: '12%',
                        left: isMobile ? '4px' : '-24px',
                        zIndex: 3,
                        background: 'rgba(255, 255, 255, 0.85)',
                        backdropFilter: 'blur(10px)',
                        borderRadius: 16,
                        padding: isMobile ? '8px 12px' : '14px 22px',
                        border: '1px solid rgba(255, 255, 255, 0.5)',
                        boxShadow: '0 20px 40px rgba(10, 17, 40, 0.06)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                      }}>
                        <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--color-secondary)' }} />
                        <div>
                          <div style={{ fontSize: isMobile ? 9 : 10, color: 'var(--color-text-secondary)', fontWeight: 500 }}>Nov Gross Payroll</div>
                          <div style={{ fontSize: isMobile ? 12 : 14, fontWeight: 500, color: 'var(--color-text-primary)' }}>₹42.50 Lakhs</div>
                        </div>
                      </div>

                      {/* Floating Glassmorphism Badge 3 */}
                      <div className="floating-widget-hover" style={{
                        position: 'absolute',
                        top: '45%',
                        left: isMobile ? '4px' : '-36px',
                        zIndex: 3,
                        background: 'rgba(255, 255, 255, 0.85)',
                        backdropFilter: 'blur(10px)',
                        borderRadius: 16,
                        padding: isMobile ? '8px 12px' : '14px 22px',
                        border: '1px solid rgba(255, 255, 255, 0.5)',
                        boxShadow: '0 20px 40px rgba(10, 17, 40, 0.06)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                      }}>
                        <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--color-primary)' }} />
                        <div>
                          <div style={{ fontSize: isMobile ? 9 : 10, color: 'var(--color-text-secondary)', fontWeight: 500 }}>Direct Payouts</div>
                          <div style={{ fontSize: isMobile ? 12 : 14, fontWeight: 500, color: 'var(--color-text-primary)' }}>ICICI Bank Sync</div>
                        </div>
                      </div>
                    </div>
                  </ScrollReveal>
                </Col>
              </Row>
            </div>

            {/* Slide 2: GST Invoicing */}
            <div style={{ flex: '0 0 100%', width: '100%', padding: isMobile ? '0 16px' : '0 48px', boxSizing: 'border-box', scrollSnapAlign: 'start', scrollSnapStop: 'always' }} key="gst-tab">
              <Row gutter={isMobile ? [16, 24] : [48, 48]} align="middle">
                {/* Description */}
                <Col xs={24} lg={11}>
                  <ScrollReveal animation="fade-in-left">
                    <h3 style={{ fontSize: '2rem', fontWeight: 500, color: 'var(--color-text-primary)', marginBottom: 20, letterSpacing: '-1px', lineHeight: 1.2 }}>
                      GST Invoicing & Double-Entry Accounting
                    </h3>
                    <p style={{ color: 'var(--color-text-secondary)', lineHeight: 1.8, fontSize: 15, marginBottom: 32 }}>
                      Issue legal tax invoices, process instant double-entry banking ledger transactions, and audit P&L statements directly. Includes Razorpay integration to reconcile payment files dynamically.
                    </p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 32 }}>
                      {[
                        'Compliant GST invoice issuance & filings',
                        'Automatic double-entry accounts ledger entry',
                        'Razorpay and banking settlements reconciliation',
                        'Instant Profit & Loss registry compiler'
                      ].map(item => (
                        <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 20, height: 20, borderRadius: '50%', background: 'rgba(0,200,83,0.1)', color: 'var(--color-success)', fontSize: 12, fontWeight: 700 }}>✓</div>
                          <span style={{ fontSize: 14.5, color: 'var(--color-text-secondary)' }}>{item}</span>
                        </div>
                      ))}
                    </div>

                    <Button type="link" onClick={() => navigate('/accounts')} style={{ color: 'var(--color-success)', padding: 0, fontWeight: 500, fontSize: 15, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      Explore Accounts Ledger Panel <span style={{ transition: 'transform 0.2s' }} className="arrow-hover">→</span>
                    </Button>
                  </ScrollReveal>
                </Col>

                {/* GST Dashboard Visual Showcase */}
                <Col xs={24} lg={13}>
                  <ScrollReveal animation="fade-in-right">
                    <div style={{
                      position: 'relative',
                      width: '100%',
                      padding: isMobile ? '20px 12px' : '20px 40px 20px 20px',
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center'
                    }}>
                      {/* Glass Card Image Panel */}
                      <div style={{
                        position: 'relative',
                        zIndex: 2,
                        background: 'rgba(255, 255, 255, 0.6)',
                        backdropFilter: 'blur(20px)',
                        borderRadius: 24,
                        padding: 12,
                        border: '1px solid rgba(255, 255, 255, 0.4)',
                        boxShadow: '0 30px 60px rgba(10, 17, 40, 0.06), 0 0 0 1px rgba(10, 17, 40, 0.02)',
                        transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
                        cursor: 'pointer',
                        overflow: 'hidden',
                        width: '100%'
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.transform = 'translateY(-6px) scale(1.01)';
                        e.currentTarget.style.boxShadow = '0 40px 80px rgba(10, 17, 40, 0.1)';
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.transform = 'translateY(0) scale(1)';
                        e.currentTarget.style.boxShadow = '0 30px 60px rgba(10, 17, 40, 0.06), 0 0 0 1px rgba(10, 17, 40, 0.02)';
                      }}>
                        {/* Morphing Organic Glow */}
                        <div className="morphing-blob" style={{
                          position: 'absolute',
                          width: '120%',
                          height: '120%',
                          top: '-10%',
                          left: '-10%',
                          background: 'radial-gradient(circle, rgba(0,200,83,0.12) 0%, transparent 70%)',
                          filter: 'blur(45px)',
                          zIndex: 1,
                          pointerEvents: 'none'
                        }} />
                        <img 
                          src="/gst-dashboard.jpg" 
                          alt="Saptta GST Invoicing & Accounting Cockpit" 
                          style={{
                            width: '100%',
                            height: 'auto',
                            borderRadius: 16,
                            display: 'block',
                            boxShadow: '0 4px 16px rgba(0,0,0,0.04)',
                            position: 'relative',
                            zIndex: 2
                          }} 
                        />
                      </div>

                      {/* Floating Glassmorphism Badge 1 */}
                      <div className="floating-widget-hover" style={{
                        position: 'absolute',
                        top: '12%',
                        left: isMobile ? '4px' : '-24px',
                        zIndex: 3,
                        background: 'rgba(255, 255, 255, 0.85)',
                        backdropFilter: 'blur(10px)',
                        borderRadius: 16,
                        padding: isMobile ? '8px 12px' : '14px 22px',
                        border: '1px solid rgba(255, 255, 255, 0.5)',
                        boxShadow: '0 20px 40px rgba(10, 17, 40, 0.06)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                      }}>
                        <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#00C853' }} />
                        <div>
                          <div style={{ fontSize: isMobile ? 9 : 10, color: 'var(--color-text-secondary)', fontWeight: 500 }}>Razorpay Settlement</div>
                          <div style={{ fontSize: isMobile ? 12 : 14, fontWeight: 500, color: 'var(--color-text-primary)' }}>100% Synced</div>
                        </div>
                      </div>

                      {/* Floating Glassmorphism Badge 2 */}
                      <div className="floating-widget-hover" style={{
                        position: 'absolute',
                        bottom: '12%',
                        right: isMobile ? '4px' : '-24px',
                        zIndex: 3,
                        background: 'rgba(255, 255, 255, 0.85)',
                        backdropFilter: 'blur(10px)',
                        borderRadius: 16,
                        padding: isMobile ? '8px 12px' : '14px 22px',
                        border: '1px solid rgba(255, 255, 255, 0.5)',
                        boxShadow: '0 20px 40px rgba(10, 17, 40, 0.06)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                      }}>
                        <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--color-primary)' }} />
                        <div>
                          <div style={{ fontSize: isMobile ? 9 : 10, color: 'var(--color-text-secondary)', fontWeight: 500 }}>GST Returns GSTR-1</div>
                          <div style={{ fontSize: isMobile ? 12 : 14, fontWeight: 500, color: 'var(--color-text-primary)' }}>Auto-Compiled</div>
                        </div>
                      </div>

                      {/* Floating Glassmorphism Badge 3 */}
                      <div className="floating-widget-hover" style={{
                        position: 'absolute',
                        top: '45%',
                        left: isMobile ? '4px' : '-36px',
                        zIndex: 3,
                        background: 'rgba(255, 255, 255, 0.85)',
                        backdropFilter: 'blur(10px)',
                        borderRadius: 16,
                        padding: isMobile ? '8px 12px' : '14px 22px',
                        border: '1px solid rgba(255, 255, 255, 0.5)',
                        boxShadow: '0 20px 40px rgba(10, 17, 40, 0.06)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                      }}>
                        <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--color-secondary)' }} />
                        <div>
                          <div style={{ fontSize: isMobile ? 9 : 10, color: 'var(--color-text-secondary)', fontWeight: 500 }}>P&L Register</div>
                          <div style={{ fontSize: isMobile ? 12 : 14, fontWeight: 500, color: 'var(--color-text-primary)' }}>Zero Discrepancies</div>
                        </div>
                      </div>
                    </div>
                  </ScrollReveal>
                </Col>
              </Row>
            </div>

            {/* Slide 3: Claude AI Auditor */}
            <div style={{ flex: '0 0 100%', width: '100%', padding: isMobile ? '0 16px' : '0 48px', boxSizing: 'border-box', scrollSnapAlign: 'start', scrollSnapStop: 'always' }} key="claude-tab">
              <Row gutter={isMobile ? [16, 24] : [48, 48]} align="middle">
                {/* Description */}
                <Col xs={24} lg={11}>
                  <ScrollReveal animation="fade-in-left">
                    <h3 style={{ fontSize: '2rem', fontWeight: 500, color: 'var(--color-text-primary)', marginBottom: 20, letterSpacing: '-1px', lineHeight: 1.2 }}>
                      Chatbot HR Support & Smart Tax Auditing
                    </h3>
                    <p style={{ color: 'var(--color-text-secondary)', lineHeight: 1.8, fontSize: 15, marginBottom: 28 }}>
                      SAPTTA coordinates natively with Anthropic's Claude LLMs to analyze payroll anomalies, draft quick reports, audit GST billing accounts, and provide instant employee onboarding support.
                    </p>
                    
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 32 }}>
                      {['Smart Payroll Anomaly Audits', 'Chatbot Employee HR Desk', 'Automated GST Returns Filing Support', 'LangChain Native Engine'].map(f => (
                        <span key={f} style={{
                          padding: '8px 16px', borderRadius: 8, background: 'var(--color-bg-container)', border: '1px solid rgba(10,17,40,0.06)',
                          fontSize: 13, fontWeight: 500, color: 'rgba(10,17,40,0.65)'
                        }}>
                          {f}
                        </span>
                      ))}
                    </div>
                  </ScrollReveal>
                </Col>

                {/* Claude Conversational Console Terminal */}
                <Col xs={24} lg={13}>
                  <ScrollReveal animation="scale-in">
                    <div style={{
                      position: 'relative',
                      width: '100%',
                      padding: isMobile ? '20px 12px' : '20px 20px 20px 40px',
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center'
                    }}>
                      {/* Futuristic MacOS-Style Control Bar & Terminal */}
                      <div style={{
                        position: 'relative',
                        zIndex: 2,
                        background: '#060B1A', 
                        borderRadius: 24,
                        border: '1px solid rgba(255, 109, 0, 0.15)',
                        boxShadow: '0 30px 60px rgba(0, 0, 0, 0.4), 0 0 40px rgba(255, 109, 0, 0.05)',
                        overflow: 'hidden', 
                        display: 'flex', 
                        flexDirection: 'column',
                        width: '100%'
                      }}>
                        {/* Futuristic MacOS-Style Control Bar */}
                        <div style={{ 
                          background: '#0A1128', 
                          padding: '16px 24px', 
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          alignItems: 'center',
                          borderBottom: '1px solid rgba(255, 109, 0, 0.1)'
                        }}>
                           <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#FF5F56', display: 'inline-block' }} />
                              <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#FFBD2E', display: 'inline-block' }} />
                              <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#27C93F', display: 'inline-block' }} />
                              <span style={{ color: 'rgba(255,255,255,0.4)', fontFamily: 'monospace', fontSize: 11, marginLeft: 12, letterSpacing: '0.5px' }}>saptta_ai_auditor.sh</span>
                           </div>
                           <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#00E676', boxShadow: '0 0 12px #00E676', animation: 'logoBgPulse 2s infinite' }} />
                              <span style={{ background: 'rgba(255, 109, 0, 0.15)', border: '1px solid rgba(255,109,0,0.3)', padding: '4px 12px', borderRadius: 8, fontSize: 10, color: '#FF6D00', fontWeight: 500, fontFamily: 'monospace' }}>
                                AI_SECURE_OK
                              </span>
                           </div>
                        </div>

                        <div className="sandbox-inner-padding" style={{ padding: '32px 28px', background: '#060B1A', minHeight: 330, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', position: 'relative' }}>
                          <div style={{ marginTop: 10 }}>
                            {/* User Command Prompt */}
                            {chatState !== 'idle' && (
                              <div className="chat-message-reveal" style={{ display: 'flex', gap: 12, marginBottom: 20, justifyContent: 'flex-end' }}>
                                {chatState === 'typing-user' ? (
                                  <div className="typing-cursor" style={{
                                    background: '#0A1128', 
                                    borderRadius: '16px 16px 4px 16px',
                                    padding: '14px 20px', 
                                    color: 'rgba(255,255,255,0.5)', 
                                    fontSize: 13,
                                    fontFamily: 'monospace',
                                    border: '1px solid rgba(255, 255, 255, 0.08)'
                                  }}>
                                    saptta@admin:~$ run_audit --month=nov_24
                                  </div>
                                ) : (
                                  <div style={{
                                    background: '#0A1128', 
                                    borderRadius: '16px 16px 4px 16px',
                                    padding: '14px 20px', 
                                    color: 'rgba(255,255,255,0.95)', 
                                    fontSize: 13, 
                                    maxWidth: '85%', 
                                    boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
                                    fontFamily: 'monospace',
                                    border: '1px solid rgba(255, 255, 255, 0.08)'
                                  }}>
                                    <span style={{ color: '#00E676' }}>saptta@admin:~$</span> audit_payroll --cycle="November 2024" --flag-discrepancies
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Claude AI CLI Response */}
                            {(chatState === 'typing-claude' || chatState === 'show-claude') && (
                              <div className="chat-message-reveal" style={{ display: 'flex', gap: 12 }}>
                                <div style={{
                                  width: 32, height: 32, borderRadius: '50%', background: 'rgba(255, 109, 0, 0.15)',
                                  border: '1px solid rgba(255, 109, 0, 0.3)',
                                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                                  fontSize: 13, fontWeight: 500, color: '#FF6D00'
                                }}>
                                  ✦
                                </div>

                                {chatState === 'typing-claude' ? (
                                  <div className="typing-cursor" style={{
                                    background: '#0A1128', 
                                    border: '1px solid rgba(255, 109, 0, 0.2)',
                                    borderRadius: '16px 16px 16px 4px', 
                                    padding: '16px 20px', 
                                    color: '#FF6D00',
                                    fontSize: 13,
                                    fontFamily: 'monospace'
                                  }}>
                                    [PROCESS] Scanning biometric registers and statutory tax ledgers...
                                  </div>
                                ) : (
                                  <div style={{
                                    background: '#0A1128', 
                                    border: '1px solid rgba(255, 109, 0, 0.25)',
                                    borderRadius: '16px 16px 16px 4px', 
                                    padding: '20px 24px', 
                                    color: '#E0E6ED',
                                    fontSize: 13.5, 
                                    maxWidth: '85%', 
                                    boxShadow: '0 12px 32px rgba(0,0,0,0.3)',
                                    fontFamily: 'monospace',
                                    lineHeight: 1.6
                                  }}>
                                    <div style={{ color: '#FF6D00', fontWeight: 500, fontSize: 11, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#FF6D00' }} /> SAPTTA AI AUDITOR v1.0.4
                                    </div>
                                    <span style={{ color: '#FFF', display: 'block', marginBottom: 8 }}>[AUDIT RESULT] Mismatch Found (1 Flagged):</span>
                                    <span style={{ color: 'rgba(255,255,255,0.6)' }}>• Employee </span>
                                    <span style={{ color: '#FFD54F' }}>#802 (Rahul Sharma)</span>
                                    <span style={{ color: 'rgba(255,255,255,0.6)' }}> missing biometric punch for 24-Nov-2024.</span>
                                    <br />
                                    <span style={{ color: 'rgba(255,255,255,0.6)' }}>• Recommendation: Deduct 1 day leave or request manual approval.</span>
                                    <br />
                                    <span style={{ color: '#00E676' }}>• ESI & PF computations: 100% compliant with statutory limits.</span>
                                  </div>
                                )}
                              </div>
                            )}

                            {chatState === 'idle' && (
                              <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.25)', fontSize: 13, padding: '50px 0', fontFamily: 'monospace' }}>
                                <span>⚡ Standing by... Waiting for console prompt stream.</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Floating Glassmorphism Badge 1 - AI Agent */}
                      <div className="floating-widget-hover" style={{
                        position: 'absolute',
                        top: '12%',
                        right: isMobile ? '4px' : '-24px',
                        zIndex: 3,
                        background: 'rgba(255, 255, 255, 0.85)',
                        backdropFilter: 'blur(10px)',
                        borderRadius: 16,
                        padding: isMobile ? '8px 12px' : '14px 22px',
                        border: '1px solid rgba(255, 255, 255, 0.5)',
                        boxShadow: '0 20px 40px rgba(10, 17, 40, 0.06)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                      }}>
                        <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--color-primary)' }} />
                        <div>
                          <div style={{ fontSize: isMobile ? 9 : 10, color: 'var(--color-text-secondary)', fontWeight: 500 }}>Active AI Agent</div>
                          <div style={{ fontSize: isMobile ? 12 : 14, fontWeight: 500, color: 'var(--color-text-primary)' }}>Claude-3.5-Sonnet</div>
                        </div>
                      </div>

                      {/* Floating Glassmorphism Badge 2 - Audit Integrity */}
                      <div className="floating-widget-hover" style={{
                        position: 'absolute',
                        bottom: '12%',
                        left: isMobile ? '4px' : '-24px',
                        zIndex: 3,
                        background: 'rgba(255, 255, 255, 0.85)',
                        backdropFilter: 'blur(10px)',
                        borderRadius: 16,
                        padding: isMobile ? '8px 12px' : '14px 22px',
                        border: '1px solid rgba(255, 255, 255, 0.5)',
                        boxShadow: '0 20px 40px rgba(10, 17, 40, 0.06)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                      }}>
                        <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#00C853' }} />
                        <div>
                          <div style={{ fontSize: isMobile ? 9 : 10, color: 'var(--color-text-secondary)', fontWeight: 500 }}>Audit Integrity</div>
                          <div style={{ fontSize: isMobile ? 12 : 14, fontWeight: 500, color: 'var(--color-text-primary)' }}>Zero Anomalies</div>
                        </div>
                      </div>
                    </div>
                  </ScrollReveal>
                </Col>
              </Row>
            </div>
          </div>


        </div>
      </section>

      {/* ── 7. Built-in Compliance Features Array ── */}
      <section className="responsive-padding" style={{ background: 'var(--color-bg-base)', padding: '100px 24px' }}>
        <div style={{ maxWidth: 1320, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 60 }}>
            <ScrollReveal animation="fade-in-down">
              <h2 style={{ fontSize: '2.4rem', fontWeight: 900, color: 'var(--color-text-primary)', marginBottom: 12, letterSpacing: '-1px' }}>
                Compliance & Safety Standard
              </h2>
              <p style={{ color: 'var(--color-text-secondary)', fontSize: '1.05rem', fontWeight: 500 }}>
                Corporate whitelisting and enterprise security protocols built-in
              </p>
            </ScrollReveal>
          </div>

          <div>
            <Row gutter={[24, 24]}>
              {[
                { title: 'AWS Cloud Security', desc: 'Secure encryption standards with automated daily database backups.', accent: 'var(--color-primary)' },
                { title: 'Indian Statutory Compliance', desc: 'Zero workarounds for ESI, PF, CGST, SGST, IGST, and Professional Tax calculations.', accent: 'var(--color-secondary)' },
                { title: 'Interactive Smart Automation', desc: 'Smart biometric sync, payroll ledger computation, and auto-reminders.', accent: 'var(--color-primary)' },
                { title: 'Real-Time Auditing Registers', desc: 'Instant P&L registries, ledger details, and audit-ready spreadsheets.', accent: 'var(--color-secondary)' },
                { title: 'Mobile Whitelist Geofencing', desc: 'Precise GPS bounds to verify field punches directly from our official application.', accent: 'var(--color-primary)' },
                { title: 'Unified Multi-Company Bridging', desc: 'Manage unlimited company files and branch structures from a single dashboard.', accent: 'var(--color-secondary)' },
              ].map((f, i) => (
                <Col key={f.title} xs={24} sm={12} lg={8}>
                  <ScrollReveal animation="fade-in-up" delay={i * 80}>
                    <div className="card-hover" style={{
                      padding: 32, borderRadius: 16,
                      background: 'var(--color-bg-container)',
                      border: '1px solid rgba(10,17,40,0.06)',
                      borderLeft: `4px solid ${f.accent}`,
                      boxShadow: '0 8px 32px rgba(10, 17, 40, 0.02)',
                      height: '100%',
                    }}>
                      <h4 style={{ fontWeight: 800, color: 'var(--color-text-primary)', marginBottom: 12, fontSize: 16.5, letterSpacing: '-0.5px' }}>{f.title}</h4>
                      <p style={{ color: 'var(--color-text-secondary)', fontSize: 13.5, lineHeight: 1.7, margin: 0 }}>{f.desc}</p>
                    </div>
                  </ScrollReveal>
                </Col>
              ))}
            </Row>
          </div>
        </div>
      </section>

      {/* ── 8. Partner Integrations ── */}
      <section className="responsive-padding" style={{ background: 'var(--color-bg-container)', padding: '80px 24px', borderTop: '1px solid #EAECEF', borderBottom: '1px solid #EAECEF' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', textAlign: 'center' }}>
          <ScrollReveal animation="fade-in-down">
            <h2 style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--color-text-primary)', marginBottom: 12, letterSpacing: '-0.5px' }}>
              Native Partner Integrations
            </h2>
            <p style={{ color: 'var(--color-text-secondary)', marginBottom: 40, fontSize: 14 }}>
              Synchronize attendance and bank ledger information with tools you already deploy
            </p>
          </ScrollReveal>
          
          <ScrollReveal animation="scale-in">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'center' }}>
              {[
                'Biometric (ZKTeco / eSSL)', 'WhatsApp (MSG91)', 'Razorpay API',
                'Tally XML bridge', 'GST Suvidha Node', 'SMS Gateway alerts', 'AWS S3 Vault', 'Open API endpoints',
              ].map(item => (
                <span key={item} className="card-hover" style={{
                  padding: '12px 24px', borderRadius: 12, cursor: 'default',
                  background: 'var(--color-bg-base)', border: '1px solid rgba(10,17,40,0.06)',
                  fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)',
                  transition: 'all 0.2s ease',
                }}>
                  {item}
                </span>
              ))}
            </div>
          </ScrollReveal>
        </div>
      </section>

      <CTABanner />
    </div>
  );
}
