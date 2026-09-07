import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { 
  Store, 
  Smartphone, 
  CreditCard, 
  ShieldCheck, 
  Sparkles, 
  ChevronRight, 
  Layers, 
  CheckCircle2, 
  Utensils, 
  Sliders, 
  MessageSquare,
  Lock,
  Send,
  Building,
  Check,
  Play,
  Film,
  X
} from 'lucide-react'
import { getTenantSettings } from '@/config/tenantConfig'

export default function LandingPage() {
  const navigate = useNavigate()
  const tenant = getTenantSettings()
  
  const [showContactModal, setShowContactModal] = useState(false)
  const [showVideoModal, setShowVideoModal] = useState(false)
  const [contactSubmitted, setContactSubmitted] = useState(false)
  const [formData, setFormData] = useState({
    businessName: '',
    contactName: '',
    phone: '',
    email: '',
    needs: 'POS Multicaja + Terminal Clip',
    notes: '',
  })

  // URL del video (configurable vía env VITE_DEMO_VIDEO_URL o video mp4 en public/)
  const videoUrl = import.meta.env.VITE_DEMO_VIDEO_URL || '/demo_video.mp4'
  const isEmbedVideo = videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be') || videoUrl.includes('vimeo.com')

  const handleSubmitContact = (e: React.FormEvent) => {
    e.preventDefault()
    setContactSubmitted(true)
    setTimeout(() => {
      // Redigir o cerrar tras mostrar mensaje de confirmación
    }, 2000)
  }

  const handleWhatsAppContact = () => {
    const text = encodeURIComponent(
      `Hola equipo Reisbloc 👋 Me interesa una propuesta personalizada a la medida para mi negocio: ${formData.businessName || 'Restaurante'}.`
    )
    window.open(`https://wa.me/525500000000?text=${text}`, '_blank')
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-teal-500 selection:text-white">
      {/* Dynamic Background Pattern */}
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_top_left,rgba(20,184,166,0.12),transparent_35%),radial-gradient(circle_at_top_right,rgba(245,158,11,0.1),transparent_30%),linear-gradient(180deg,rgba(15,23,42,1),rgba(2,6,23,1))] pointer-events-none z-0" />

      {/* Header / Navbar */}
      <header className="relative z-20 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-xl sticky top-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {tenant.logoUrl && !tenant.logoUrl.includes('logo_localito') ? (
              <img src={tenant.logoUrl} alt="Reisbloc" className="h-10 w-auto" />
            ) : (
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center text-white shadow-lg shadow-teal-900/40">
                  <Store size={22} />
                </div>
                <div>
                  <span className="text-xl font-black tracking-tight text-white block leading-none">REISBLOC</span>
                  <span className="text-[10px] font-extrabold tracking-widest text-amber-400 uppercase">F&B Software · reisbloc.com & reisbloc.store</span>
                </div>
              </div>
            )}
          </div>

          <nav className="hidden md:flex items-center gap-8 text-sm font-semibold text-slate-300">
            <a href="#soluciones" className="hover:text-teal-400 transition-colors">Soluciones</a>
            <a href="#clip" className="hover:text-teal-400 transition-colors">Terminal Clip Total 3</a>
            <a href="#personalizado" className="hover:text-teal-400 transition-colors">100% Personalizado</a>
            <button onClick={() => setShowVideoModal(true)} className="hover:text-amber-400 transition-colors flex items-center gap-1.5 text-amber-300 font-bold">
              <Play size={14} className="fill-amber-400" />
              <span>Ver Video Demo</span>
            </button>
          </nav>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowContactModal(true)}
              className="hidden sm:inline-flex px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-teal-300 border border-teal-500/30 text-xs font-black transition-all hover:scale-105"
            >
              Solicitar Cotización
            </button>

            <Link
              to="/login"
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white font-black text-xs shadow-lg shadow-teal-900/30 transition-all hover:scale-105 flex items-center gap-2"
            >
              <span>Acceso POS</span>
              <ChevronRight size={16} />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative z-10 pt-16 pb-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-center md:text-left">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-12 items-center">
          <div className="md:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-teal-500/10 border border-teal-500/30 text-teal-300 text-xs font-bold">
              <Sparkles size={14} className="text-amber-400" />
              <span>Espejo Oficial · reisbloc.com & reisbloc.store</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white leading-tight tracking-tight">
              Software POS Gastronómico <br />
              <span className="bg-gradient-to-r from-teal-400 via-emerald-400 to-amber-400 bg-clip-text text-transparent">
                100% Personalizado a tu Medida
              </span>
            </h1>

            <p className="text-slate-300 text-base sm:text-lg leading-relaxed font-medium max-w-2xl">
              Sin planes rígidos ni paquetes genéricos. Diseñamos la infraestructura tecnológica exacta de tu restaurante, bar o dark kitchen con integración automática a <strong>Terminal Clip Total 3</strong>, comanderos multi-estación, menú QR y control de inventarios.
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-4 pt-4">
              <button
                onClick={() => setShowContactModal(true)}
                className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-teal-500 via-emerald-500 to-teal-600 text-slate-950 font-black text-sm shadow-xl shadow-teal-900/40 hover:scale-105 transition-all flex items-center justify-center gap-3"
              >
                <Sliders size={18} />
                <span>Diseñar Mi Solución a la Medida</span>
              </button>

              <button
                onClick={() => setShowVideoModal(true)}
                className="w-full sm:w-auto px-6 py-4 rounded-2xl bg-slate-900 hover:bg-slate-800 text-amber-300 border border-amber-500/40 font-extrabold text-sm transition-all flex items-center justify-center gap-2.5 shadow-lg shadow-amber-500/10 hover:scale-105"
              >
                <div className="w-7 h-7 rounded-full bg-amber-500/20 flex items-center justify-center border border-amber-500/40">
                  <Play size={14} className="fill-amber-400 text-amber-400 ml-0.5" />
                </div>
                <span>Ver Video de Demostración</span>
              </button>
            </div>

            {/* Quick Badges */}
            <div className="pt-6 grid grid-cols-3 gap-4 border-t border-slate-800/80 max-w-lg">
              <div>
                <span className="block text-xl font-black text-amber-400">0%</span>
                <span className="text-xs text-slate-400 font-medium">Precios Rígidos</span>
              </div>
              <div>
                <span className="block text-xl font-black text-teal-400">Clip Total 3</span>
                <span className="text-xs text-slate-400 font-medium">Auto-Charge API</span>
              </div>
              <div>
                <span className="block text-xl font-black text-emerald-400">PCI SAQ A</span>
                <span className="text-xs text-slate-400 font-medium">Cumplimiento Auditado</span>
              </div>
            </div>
          </div>

          {/* Right Visual Feature Card */}
          <div className="md:col-span-5 relative">
            <div className="relative rounded-3xl bg-slate-900/90 border border-slate-800 p-6 shadow-2xl space-y-6">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                    <Smartphone size={20} />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-white text-sm">Clip Total 3 + POS Reisbloc</h3>
                    <p className="text-xs text-slate-400">Integración Directa sin Digitación</p>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800 text-[10px] font-black uppercase">
                  Conectado
                </span>
              </div>

              {/* Sample Payment Box */}
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800/80 space-y-3">
                <div className="flex justify-between text-xs text-slate-400 font-medium">
                  <span>Subtotal Consumos:</span>
                  <span className="text-slate-200 font-bold">$100.00 MXN</span>
                </div>
                <div className="flex justify-between text-xs text-amber-400 font-semibold">
                  <span>Cargo Servicio Tarjeta (3% + $1):</span>
                  <span>+$4.00 MXN</span>
                </div>
                <div className="flex justify-between text-sm font-black text-white pt-2 border-t border-slate-800">
                  <span>Total Enviado a Terminal:</span>
                  <span className="text-amber-400">$104.00 MXN</span>
                </div>
              </div>

              <div className="space-y-2 text-xs text-slate-300 font-medium">
                <div className="flex items-center gap-2 text-emerald-400">
                  <CheckCircle2 size={16} />
                  <span>Cobro automático transmitido a la pantalla táctil de la terminal.</span>
                </div>
                <div className="flex items-center gap-2 text-emerald-400">
                  <CheckCircle2 size={16} />
                  <span>Desglose explícito en ticket impreso para comensales.</span>
                </div>
                <div className="flex items-center gap-2 text-emerald-400">
                  <CheckCircle2 size={16} />
                  <span>Reconciliación en tiempo real vía Webhooks desatendidos.</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section: Custom Tailored Model (NO PRECIOS FIJOS) */}
      <section id="personalizado" className="relative z-10 py-20 bg-slate-900/60 border-y border-slate-800/80 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-bold">
              <Sliders size={14} className="text-amber-400" />
              <span>Modelo de Desarrollo a la Medida</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-white">
              ¿Por qué no mostramos planes de precios fijos?
            </h2>
            <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
              Sabemos que ningún restaurante opera exactamente igual a otro. En <strong>Reisbloc F&B</strong> eliminamos las suscripciones infladas y los paquetes rígidos con funciones que nunca vas a usar. Todo nuestro ecosistema se adapta 100% a tus flujos operativos.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-slate-950 p-8 rounded-3xl border border-slate-800 space-y-4 relative overflow-hidden group hover:border-teal-500/40 transition-all">
              <div className="w-12 h-12 rounded-2xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400 font-bold">
                <Layers size={24} />
              </div>
              <h3 className="text-xl font-bold text-white">Módulos a tu Elección</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Elige únicamente los módulos que necesitas: POS Multicaja, Monitor de Mesas, Comanda de Cocina, Fichas Técnicas de Recetas o Reportes Financieros.
              </p>
            </div>

            <div className="bg-slate-950 p-8 rounded-3xl border border-slate-800 space-y-4 relative overflow-hidden group hover:border-amber-500/40 transition-all">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 font-bold">
                <CreditCard size={24} />
              </div>
              <h3 className="text-xl font-bold text-white">Reglas Comerciales de Pago</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Configura comisiones por tarjeta personalizadas (ej. 3% + $1.00 MXN), propinas opcionales u obligatorias, o reglas de propina sugerida según tu tenant.
              </p>
            </div>

            <div className="bg-slate-950 p-8 rounded-3xl border border-slate-800 space-y-4 relative overflow-hidden group hover:border-emerald-500/40 transition-all">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold">
                <Building size={24} />
              </div>
              <h3 className="text-xl font-bold text-white">Dominio & Marca Propia</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Despliegue exclusivo bajo tu propio subdominio (`tu-negocio.reisbloc.com` o `tu-negocio.reisbloc.store`) con tu logotipo y paleta de colores.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Section: Solutions & Features */}
      <section id="soluciones" className="relative z-10 py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
          <h2 className="text-3xl sm:text-4xl font-black text-white">
            Soluciones Integrales para la Industria F&B
          </h2>
          <p className="text-slate-400 text-sm sm:text-base">
            Tecnología robusta diseñada por expertos para acelerar la operación de tu negocio.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-slate-900/80 p-6 rounded-3xl border border-slate-800 space-y-3">
            <Smartphone className="text-teal-400" size={28} />
            <h4 className="font-extrabold text-white text-base">Terminal Clip Total 3</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Cobros automáticos desde el POS hacia la terminal con lecturas sin contacto y recibos térmicos.
            </p>
          </div>

          <div className="bg-slate-900/80 p-6 rounded-3xl border border-slate-800 space-y-3">
            <Utensils className="text-amber-400" size={28} />
            <h4 className="font-extrabold text-white text-base">Comandero Multi-Estación</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Sincronización en tiempo real entre la Caja PC principal, iPads portátiles y monitores de cocina.
            </p>
          </div>

          <div className="bg-slate-900/80 p-6 rounded-3xl border border-slate-800 space-y-3">
            <ShieldCheck className="text-emerald-400" size={28} />
            <h4 className="font-extrabold text-white text-base">Seguridad PCI-DSS & OWASP</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Cero almacenamiento de datos sensibles de tarjetas, auditoría inmutable de movimientos e hiper-aislamiento RLS.
            </p>
          </div>

          <div className="bg-slate-900/80 p-6 rounded-3xl border border-slate-800 space-y-3">
            <Lock className="text-cyan-400" size={28} />
            <h4 className="font-extrabold text-white text-base">Aislamiento Multi-Tenant</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Bases de datos independientes y seguridad estricta para garantizar que tus ventas e inventarios nunca se mezclen.
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative z-10 py-16 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
        <div className="rounded-3xl bg-gradient-to-r from-teal-900 via-slate-900 to-amber-950 p-8 sm:p-12 border border-teal-500/30 text-center space-y-6 shadow-2xl relative overflow-hidden">
          <h2 className="text-3xl sm:text-4xl font-black text-white">
            ¿Listo para llevar tu restaurante al siguiente nivel?
          </h2>
          <p className="text-slate-300 text-sm sm:text-base max-w-2xl mx-auto font-medium">
            Solicita una cotización personalizada sin compromiso. Analizamos tus necesidades y te entregamos una propuesta a la medida.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <button
              onClick={() => setShowContactModal(true)}
              className="px-8 py-4 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm shadow-xl transition-all hover:scale-105 flex items-center gap-2"
            >
              <MessageSquare size={18} />
              <span>Solicitar Cotización Personalizada</span>
            </button>

            <button
              onClick={handleWhatsAppContact}
              className="px-6 py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-sm transition-all flex items-center gap-2"
            >
              <Send size={18} />
              <span>Contactar por WhatsApp</span>
            </button>
          </div>
        </div>
      </section>

      {/* Contact Modal */}
      {showContactModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-6 shadow-2xl text-white relative">
            <button
              onClick={() => setShowContactModal(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white"
            >
              ✕
            </button>

            {contactSubmitted ? (
              <div className="text-center py-8 space-y-4">
                <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                  <Check size={32} />
                </div>
                <h3 className="text-2xl font-black text-white">¡Solicitud Recibida!</h3>
                <p className="text-slate-300 text-xs leading-relaxed">
                  Gracias por tu interés. Un especialista de Reisbloc F&B se pondrá en contacto contigo para entregar la propuesta personalizada.
                </p>
                <button
                  onClick={() => {
                    setContactSubmitted(false)
                    setShowContactModal(false)
                  }}
                  className="px-6 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold"
                >
                  Cerrar
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmitContact} className="space-y-4">
                <div>
                  <h3 className="text-xl font-black text-white">Cotización a la Medida</h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Ingresa tus datos y te entregaremos una propuesta personalizada sin costo.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Nombre del Restaurante / Negocio</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Taquería El Pastor / Resto Bar"
                    value={formData.businessName}
                    onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs focus:outline-none focus:border-teal-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">Tu Nombre</label>
                    <input
                      type="text"
                      required
                      placeholder="Ej. Juan Pérez"
                      value={formData.contactName}
                      onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                      className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs focus:outline-none focus:border-teal-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">Teléfono / WhatsApp</label>
                    <input
                      type="tel"
                      required
                      placeholder="Ej. 55 1234 5678"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs focus:outline-none focus:border-teal-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Requerimientos Principales</label>
                  <select
                    value={formData.needs}
                    onChange={(e) => setFormData({ ...formData, needs: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs focus:outline-none focus:border-teal-500"
                  >
                    <option value="POS Multicaja + Terminal Clip">POS Multicaja + Terminal Clip Total 3</option>
                    <option value="Menú Digital QR + Auto-orden">Menú Digital QR + Auto-orden</option>
                    <option value="Inventarios + Fichas Técnicas">Control de Inventarios & Recetas</option>
                    <option value="Solución Integral Completa">Proyecto Integral a la Medida</option>
                  </select>
                </div>

                <button
                  type="submit"
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-400 hover:to-emerald-500 text-slate-950 font-black text-xs shadow-lg transition-all"
                >
                  Enviar Solicitud de Cotización
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Video Modal Explicativo */}
      {showVideoModal && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-xl z-50 flex items-center justify-center p-4 sm:p-6 animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-4xl w-full overflow-hidden shadow-2xl relative text-white space-y-4 p-4 sm:p-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center">
                  <Film size={22} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white">Demostración en Video · Reisbloc F&B</h3>
                  <p className="text-xs text-slate-400">Infraestructura tecnológica y cobros con Terminal Clip Total 3</p>
                </div>
              </div>

              <button
                onClick={() => setShowVideoModal(false)}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Container del Video */}
            <div className="relative aspect-video w-full rounded-2xl bg-black overflow-hidden border border-slate-800 shadow-inner flex items-center justify-center">
              {isEmbedVideo ? (
                <iframe
                  src={videoUrl}
                  title="Demostración Reisbloc F&B"
                  className="w-full h-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <video
                  controls
                  autoPlay
                  playsInline
                  src={videoUrl}
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    // Fallback visual si el mp4 aún no está colocado en public/
                    const target = e.target as HTMLElement
                    target.style.display = 'none'
                  }}
                >
                  Tu navegador no soporta reproducción de video HTML5.
                </video>
              )}

              {/* Mensaje de espera si el archivo mp4 aún se está cargando/generando */}
              <div className="absolute inset-0 bg-slate-950/90 flex flex-col items-center justify-center p-6 text-center space-y-4 pointer-events-none">
                <div className="w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center animate-pulse">
                  <Film size={32} />
                </div>
                <div>
                  <h4 className="text-base font-extrabold text-white">📺 Video de Presentación en Producción</h4>
                  <p className="text-xs text-slate-400 max-w-md mt-1 leading-relaxed">
                    Estamos finalizando el video promocional. Puedes colocar tu archivo MP4 en <code className="text-amber-300 font-mono">public/demo_video.mp4</code> o definir la variable <code className="text-teal-300 font-mono">VITE_DEMO_VIDEO_URL</code> en tu servidor Vercel.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 text-xs">
              <span className="text-slate-400 font-medium">
                ¿Tienes dudas sobre la integración en tu negocio?
              </span>
              <button
                onClick={() => {
                  setShowVideoModal(false)
                  setShowContactModal(true)
                }}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-400 hover:to-emerald-500 text-slate-950 font-black"
              >
                Solicitar Cotización a la Medida
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="relative z-10 border-t border-slate-800/80 bg-slate-950 py-10 px-4 sm:px-6 lg:px-8 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto space-y-3">
          <p className="font-bold text-slate-400">
            Reisbloc F&B Software · Operando en reisbloc.com y reisbloc.store
          </p>
          <p>© 2026 Reisbloc POS. Todos los derechos reservados. Desarrollo de software gastronómico personalizado.</p>
        </div>
      </footer>
    </div>
  )
}
