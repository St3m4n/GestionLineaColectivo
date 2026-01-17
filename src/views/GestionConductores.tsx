import React, { useState } from 'react';
import { useStore } from '../contexts/StateContext';
import { 
    Plus, UserPlus, Trash2, Edit3, Eye, X, FileText, 
    ShieldAlert, ShieldCheck, History, Save, Calendar
} from 'lucide-react';
import type { Conductor, Vehiculo } from '../types';

const MOTIVOS_BLOQUEO = [
    'Suspensión Administrativa',
    'Licencia de Conducir Vencida',
    'Falta de Uniforme',
    'Comportamiento Indebido',
    'Ruta No Autorizada',
    'Otro'
];

const GestionConductores: React.FC = () => {
    const { 
        conductores, addConductor, removeConductor, updateConductor, 
        vehiculos, multas 
    } = useStore();
    
    const [selectedConductor, setSelectedConductor] = useState<Conductor | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [showAddForm, setShowAddForm] = useState(false);
    const [profileTab, setProfileTab] = useState<'resumen' | 'historial' | 'multas' | 'edicion'>('resumen');
    const [motivoBloqueo, setMotivoBloqueo] = useState(MOTIVOS_BLOQUEO[0]);

    // Form states
    const [formData, setFormData] = useState({
        rut: '',
        nombre: '',
        vencimientoLicencia: '',
        vehiculoId: '' as string | number,
    });

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        const vId = formData.vehiculoId ? parseInt(formData.vehiculoId.toString()) : undefined;

        if (isEditing && selectedConductor) {
            updateConductor({
                ...selectedConductor,
                nombre: formData.nombre,
                vencimientoLicencia: formData.vencimientoLicencia,
                vehiculoId: vId,
            });
            // Update local selected state to reflect changes in UI instantly
            setSelectedConductor(prev => prev ? { 
                ...prev, 
                nombre: formData.nombre, 
                vencimientoLicencia: formData.vencimientoLicencia, 
                vehiculoId: vId 
            } : null);
            setIsEditing(false);
            setProfileTab('resumen');
        } else {
            addConductor({
                rut: formData.rut,
                nombre: formData.nombre,
                vencimientoLicencia: formData.vencimientoLicencia,
                vehiculoId: vId,
                bloqueado: false
            });
            setShowAddForm(false);
        }
    };

    const toggleBloqueo = () => {
        if (!selectedConductor) return;
        const nextState = !selectedConductor.bloqueado;
        const updated = {
            ...selectedConductor,
            bloqueado: nextState,
            motivoBloqueo: nextState ? motivoBloqueo : undefined
        };
        updateConductor(updated);
        setSelectedConductor(updated);
    };

    return (
        <div className="space-y-6">
            <header className="flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-bold text-slate-800">Padrón de Conductores</h2>
                    <p className="text-slate-500">Administración de chóferes y sus habilitaciones.</p>
                </div>
                <button 
                    onClick={() => {
                        setShowAddForm(true);
                        setIsEditing(false);
                        setFormData({ rut: '', nombre: '', vencimientoLicencia: '', vehiculoId: '' });
                    }}
                    className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition font-bold"
                >
                    <UserPlus size={20} />
                    Inscribir Conductor
                </button>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {conductores.map(c => (
                    <div 
                        key={c.rut} 
                        onClick={() => {
                            setSelectedConductor(c);
                            setIsEditing(true); // <--- Crucial fix: indicate we are in edit mode
                            setProfileTab('resumen');
                            setFormData({
                                rut: c.rut,
                                nombre: c.nombre,
                                vencimientoLicencia: c.vencimientoLicencia,
                                vehiculoId: c.vehiculoId || '',
                            });
                        }}
                        className={`p-4 rounded-xl border-2 transition cursor-pointer group hover:border-blue-500 ${selectedConductor?.rut === c.rut ? 'border-blue-600 bg-blue-50' : 'bg-white border-slate-100 hover:shadow-md'}`}
                    >
                        <div className="flex justify-between items-start mb-2">
                             <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${c.bloqueado ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
                                {c.nombre.charAt(0)}
                             </div>
                            {c.bloqueado ? <ShieldAlert className="text-red-500" size={20} /> : <ShieldCheck className="text-green-500" size={20} />}
                        </div>
                        <p className="font-bold text-slate-700 truncate">{c.nombre}</p>
                        <p className="text-xs text-slate-400 font-mono italic">{c.rut}</p>
                        <div className="mt-3 flex justify-between items-center">
                             {c.vehiculoId ? (
                                <span className="text-[10px] font-black uppercase py-0.5 px-2 bg-slate-800 text-white rounded">CUPO #{c.vehiculoId}</span>
                             ) : (
                                <span className="text-[10px] font-bold uppercase py-0.5 px-2 bg-slate-100 text-slate-400 rounded">Sin Cupo</span>
                             )}
                             {new Date(c.vencimientoLicencia) < new Date() && <span className="text-[10px] font-black text-red-600 underline">LICENCIA VENCIDA</span>}
                        </div>
                    </div>
                ))}
            </div>

            {/* MODAL PERFIL CONDUCTOR */}
            {selectedConductor && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
                        <div className="bg-slate-900 p-6 text-white flex justify-between items-center shrink-0">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center font-black text-2xl text-white">
                                    {selectedConductor.nombre.charAt(0)}
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold">{selectedConductor.nombre}</h3>
                                    <p className="text-slate-400 text-xs font-mono">{selectedConductor.rut}</p>
                                </div>
                            </div>
                            <button onClick={() => setSelectedConductor(null)} className="p-2 hover:bg-slate-800 rounded-full transition text-slate-400">
                                <X size={24} />
                            </button>
                        </div>

                        <div className="flex border-b shrink-0 bg-slate-50">
                            {[
                                { id: 'resumen', label: 'Resumen', icon: Eye },
                                { id: 'historial', label: 'Trayectoria', icon: History },
                                { id: 'multas', label: 'Fines', icon: FileText },
                                { id: 'edicion', label: 'Editar Datos', icon: Edit3 }
                            ].map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setProfileTab(tab.id as any)}
                                    className={`flex-1 py-4 flex items-center justify-center gap-2 font-bold text-sm transition ${profileTab === tab.id ? 'text-blue-600 bg-white border-b-4 border-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
                                >
                                    <tab.icon size={16} />
                                    <span className="hidden sm:inline">{tab.label}</span>
                                </button>
                            ))}
                        </div>

                        <div className="flex-1 overflow-y-auto p-8 bg-white">
                            {profileTab === 'resumen' && (
                                <div className="space-y-8 animate-in fade-in zoom-in-95">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="p-4 border rounded-xl bg-slate-50/50">
                                            <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Cupo Asignado Actualmente</label>
                                            {selectedConductor.vehiculoId ? (
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 bg-slate-800 text-white rounded-lg flex items-center justify-center font-black">
                                                        #{selectedConductor.vehiculoId}
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-slate-800">Vehículo Registrado</p>
                                                        <p className="text-xs text-slate-500 font-mono">
                                                            {vehiculos.find(v => v.id === selectedConductor.vehiculoId)?.patente || 'Sin Patente'}
                                                        </p>
                                                    </div>
                                                </div>
                                            ) : (
                                                <p className="text-slate-400 italic py-2">Sin vehículo asignado</p>
                                            )}
                                        </div>
                                        <div className="p-4 border rounded-xl bg-slate-50/50">
                                            <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Infracciones Totales</label>
                                            <div className="flex justify-between items-center">
                                                <p className="text-xl font-black text-slate-800">
                                                    {multas.filter(m => m.conductorRut === selectedConductor.rut).length}
                                                </p>
                                                <span className="text-[10px] bg-slate-200 px-2 py-1 rounded font-bold uppercase tracking-tighter">Registros en Sistema</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <h4 className="font-black text-xs uppercase text-slate-400 border-b pb-1 tracking-widest">Estado Legal</h4>
                                        <div className="grid grid-cols-1 gap-4">
                                            <div className={`p-4 border rounded-xl flex items-center justify-between ${new Date(selectedConductor.vencimientoLicencia) < new Date() ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
                                                <div className="flex items-center gap-3">
                                                    <Calendar className={new Date(selectedConductor.vencimientoLicencia) < new Date() ? 'text-red-600' : 'text-green-600'} />
                                                    <div>
                                                        <p className="text-xs font-bold text-slate-500">Vencimiento Licencia de Conducir</p>
                                                        <p className="font-black text-lg">{selectedConductor.vencimientoLicencia}</p>
                                                    </div>
                                                </div>
                                                {new Date(selectedConductor.vencimientoLicencia) < new Date() && (
                                                    <span className="bg-red-600 text-white px-3 py-1 rounded-full text-[10px] font-black animate-pulse">EXPIRADA</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {selectedConductor.bloqueado && (
                                        <div className="p-4 bg-red-600 text-white rounded-xl shadow-lg shadow-red-200 flex items-center gap-4">
                                            <ShieldAlert size={32} />
                                            <div>
                                                <p className="font-black uppercase text-sm">Conductor Sancionado</p>
                                                <p className="text-red-100 text-xs italic">Causa: {selectedConductor.motivoBloqueo || 'Administrativo'}</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {profileTab === 'edicion' && (
                                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2">
                                    <form onSubmit={handleSave} className="grid grid-cols-2 gap-4">
                                        <div className="col-span-1">
                                            <label className="text-[10px] font-black text-slate-400 uppercase">Nombre Completo</label>
                                            <input type="text" value={formData.nombre} onChange={e => setFormData({...formData, nombre: e.target.value})} className="w-full p-3 border rounded-xl bg-slate-50 focus:ring-2 focus:ring-blue-500 outline-none font-bold" />
                                        </div>
                                        <div className="col-span-1">
                                            <label className="text-[10px] font-black text-slate-400 uppercase">Vencimiento Licencia</label>
                                            <input type="date" value={formData.vencimientoLicencia} onChange={e => setFormData({...formData, vencimientoLicencia: e.target.value})} className="w-full p-3 border rounded-xl bg-slate-50 focus:ring-2 focus:ring-blue-500 outline-none" />
                                        </div>
                                        <div className="col-span-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase">Asignar a Cupo (Línea)</label>
                                            <select 
                                                value={formData.vehiculoId} 
                                                onChange={e => setFormData({...formData, vehiculoId: e.target.value})} 
                                                className="w-full p-3 border rounded-xl bg-slate-50 focus:ring-2 focus:ring-blue-500 outline-none"
                                            >
                                                <option value="">Sin cupo asignado</option>
                                                {vehiculos.map(v => (
                                                    <option key={v.id} value={v.id}>Cupo #{v.id} - {v.patente}</option>
                                                ))}
                                            </select>
                                        </div>
                                        
                                        <div className="col-span-2 flex gap-4 mt-2">
                                            <button type="submit" className="flex-1 bg-slate-900 text-white p-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-black transition">
                                                <Save size={18} /> Guardar Cambios
                                            </button>
                                            <button 
                                                type="button"
                                                onClick={() => { if(confirm('¿Eliminar conductor del sistema?')) { removeConductor(selectedConductor.rut); setSelectedConductor(null); } }}
                                                className="bg-red-50 text-red-600 p-3 rounded-xl hover:bg-red-100 transition"
                                            >
                                                <Trash2 size={20} />
                                            </button>
                                        </div>
                                    </form>

                                    <div className="pt-8 border-t space-y-4">
                                        <h4 className="font-black text-xs uppercase text-slate-400">Restricciones de Venta</h4>
                                        <div className="p-6 border rounded-2xl bg-slate-50 space-y-4">
                                            <div>
                                                <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">Motivo del Bloqueo</label>
                                                <select 
                                                    value={motivoBloqueo}
                                                    onChange={e => setMotivoBloqueo(e.target.value)}
                                                    className="w-full p-3 border rounded-xl bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                                                >
                                                    {MOTIVOS_BLOQUEO.map(m => <option key={m} value={m}>{m}</option>)}
                                                </select>
                                            </div>
                                            <button 
                                                onClick={toggleBloqueo}
                                                className={`w-full py-4 rounded-xl font-black text-white flex items-center justify-center gap-3 transition shadow-lg ${selectedConductor.bloqueado ? 'bg-green-600 hover:bg-green-700 shadow-green-100' : 'bg-red-600 hover:bg-red-700 shadow-red-100'}`}
                                            >
                                                {selectedConductor.bloqueado ? (
                                                    <><ShieldCheck /> QUITAR BLOQUEO</>
                                                ) : (
                                                    <><ShieldAlert /> BLOQUEAR PARA LA VENTA</>
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {profileTab === 'historial' && (
                                <div className="space-y-4">
                                     {(selectedConductor.historialVehiculos || [])
                                        .sort((a,b) => new Date(b.fechaInicio).getTime() - new Date(a.fechaInicio).getTime())
                                        .map((h, idx) => (
                                            <div key={idx} className="flex justify-between items-center p-4 border rounded-xl hover:bg-slate-50 transition border-l-4 border-l-blue-400">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 bg-blue-100 text-blue-700 rounded-lg flex items-center justify-center font-black">
                                                        #{h.vehiculoId}
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-slate-800">Cupo #{h.vehiculoId}</p>
                                                        <p className="text-[10px] text-slate-400 font-bold uppercase">{vehiculos.find(v => v.id === h.vehiculoId)?.patente || 'S/N'}</p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Periodo Trabajado</p>
                                                    <p className="text-sm font-bold text-slate-600">{new Date(h.fechaInicio).toLocaleDateString()} - {h.fechaFin ? new Date(h.fechaFin).toLocaleDateString() : 'Activo'}</p>
                                                </div>
                                            </div>
                                        ))}
                                </div>
                            )}

                            {profileTab === 'multas' && (
                                <div className="space-y-3">
                                    {multas.filter(m => m.conductorRut === selectedConductor.rut).length > 0 ? (
                                        multas.filter(m => m.conductorRut === selectedConductor.rut)
                                            .sort((a,b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
                                            .map(m => (
                                                <div key={m.id} className={`p-4 rounded-xl border-l-4 ${m.pagada ? 'bg-green-50 border-green-500' : 'bg-red-50 border-red-500'} flex justify-between items-center shadow-sm`}>
                                                    <div>
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <span className="text-[10px] font-black text-slate-400 uppercase">{new Date(m.fecha).toLocaleDateString()}</span>
                                                            <span className="text-[9px] bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded font-black uppercase">Cupo #{m.vehiculoId}</span>
                                                        </div>
                                                        <p className="font-bold text-slate-800">{m.motivo}</p>
                                                    </div>
                                                    <p className={`font-black text-xl ${m.pagada ? 'text-green-600' : 'text-red-600'}`}>${m.monto.toLocaleString()}</p>
                                                </div>
                                            ))
                                    ) : (
                                        <div className="py-20 text-center space-y-4">
                                            <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto">
                                                <ShieldCheck className="text-slate-300" size={40} />
                                            </div>
                                            <p className="text-slate-400 font-bold">Sin multas asociadas.</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* FORMULARIO AGREGAR CONDUCTOR */}
            {showAddForm && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl">
                        <div className="p-6 border-b flex justify-between items-center">
                            <h3 className="text-xl font-bold text-slate-800">Inscribir Nuevo Conductor</h3>
                            <button onClick={() => setShowAddForm(false)} className="text-slate-400 hover:text-slate-700 transition"><X /></button>
                        </div>
                        <form onSubmit={handleSave} className="p-6 grid grid-cols-2 gap-4">
                            <div className="col-span-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase">RUT</label>
                                <input type="text" required value={formData.rut} onChange={e => setFormData({...formData, rut: e.target.value})} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-mono" placeholder="12.345.678-9" />
                            </div>
                            <div className="col-span-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase">Venc. Licencia</label>
                                <input type="date" required value={formData.vencimientoLicencia} onChange={e => setFormData({...formData, vencimientoLicencia: e.target.value})} className="w-full p-2 border rounded-lg" />
                            </div>
                            <div className="col-span-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase">Nombre Completo</label>
                                <input type="text" required value={formData.nombre} onChange={e => setFormData({...formData, nombre: e.target.value})} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Ej: Juan Antonio Pérez" />
                            </div>
                            <div className="col-span-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase">Asignar a Cupo (Opcional)</label>
                                <select 
                                    value={formData.vehiculoId} 
                                    onChange={e => setFormData({...formData, vehiculoId: e.target.value})} 
                                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                >
                                    <option value="">Sin cupo asignado</option>
                                    {vehiculos.map(v => (
                                        <option key={v.id} value={v.id}>Cupo #{v.id} - {v.patente}</option>
                                    ))}
                                </select>
                            </div>
                            <button type="submit" className="col-span-2 bg-slate-900 text-white font-bold py-3 rounded-xl mt-4 hover:bg-black transition">
                                Registrar Conductor
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default GestionConductores;
