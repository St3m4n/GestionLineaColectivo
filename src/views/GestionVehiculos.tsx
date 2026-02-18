import React, { useState } from 'react';
import { useStore } from '../contexts/StateContext';
import { 
    Plus, Car, Trash2, Edit3, Eye, X, FileText, 
    ShieldAlert, ShieldCheck, History, Save, LayoutGrid, List, Search,
    FileCode
} from 'lucide-react';
import type { Vehiculo, RutaPrincipal } from '../types';
import * as XLSX from 'xlsx';

const MOTIVOS_BLOQUEO = [
    'Suspensión Administrativa',
    'Revisión Técnica Vencida',
    'Seguro Obligatorio Vencido',
    'Multas Pendientes',
    'Comportamiento Indebido',
    'Fuera de Servicio',
    'Otro'
];

const GestionVehiculos: React.FC = () => {
    const { 
        vehiculos, addVehiculo, removeVehiculo, updateVehiculo, 
        conductores, multas, getDynamicVariacion 
    } = useStore();

    const formatRouteDisplay = (vehiculo: Vehiculo) => {
        const variation = getDynamicVariacion(vehiculo.id);
        if (variation === 'R') return 'Variante 1 (R)';
        if (vehiculo.rutaPrincipal === 'Troncal') {
            return `Troncal ${variation}`;
        }
        return `Variante 2 ${variation}`;
    };
    
    const [selectedVehiculo, setSelectedVehiculo] = useState<Vehiculo | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [showAddForm, setShowAddForm] = useState(false);
    const [profileTab, setProfileTab] = useState<'resumen' | 'historial' | 'multas' | 'edicion'>('resumen');
    const [motivoBloqueo, setMotivoBloqueo] = useState(MOTIVOS_BLOQUEO[0]);
    
    const [activeRouteTab, setActiveRouteTab] = useState<RutaPrincipal>('Troncal');
    const [viewMode, setViewMode] = useState<'cards' | 'list'>('list');
    const [searchTerm, setSearchTerm] = useState('');
    const [filterAnio, setFilterAnio] = useState<string>('');

    const exportVehiculos = (format: 'csv' | 'xlsx') => {
        const data = filteredVehiculos.map(v => {
            const conductor = conductores.find(c => c.vehiculoId === v.id);
            return {
                Cupo: v.id,
                Modelo: v.modelo,
                Patente: v.patente,
                Propietario: v.propietario,
                Conductor: conductor ? conductor.nombre : 'Sin asignar',
                Estado: v.bloqueado ? 'Bloqueado' : 'Habilitado',
                Deuda: v.estadoCuenta.deudas,
                Año: v.anio,
                'Ruta Principal': v.rutaPrincipal
            };
        });

        const worksheet = XLSX.utils.json_to_sheet(data);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Vehículos");

        if (format === 'csv') {
            XLSX.writeFile(workbook, `Vehiculos_${activeRouteTab.replace(' ', '_')}.csv`, { bookType: 'csv' });
        } else {
            XLSX.writeFile(workbook, `Vehiculos_${activeRouteTab.replace(' ', '_')}.xlsx`);
        }
    };

    // Form states
    const [formData, setFormData] = useState({
        id: '',
        propietario: '',
        patente: '',
        modelo: '',
        anio: new Date().getFullYear(),
        vencimientoRevisionTecnica: '',
        vencimientoSeguro: '',
        rutaPrincipal: 'Troncal' as RutaPrincipal,
    });

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        if (isEditing && selectedVehiculo) {
            updateVehiculo({
                ...selectedVehiculo,
                propietario: formData.propietario,
                patente: formData.patente,
                modelo: formData.modelo,
                anio: formData.anio,
                vencimientoRevisionTecnica: formData.vencimientoRevisionTecnica,
                vencimientoSeguro: formData.vencimientoSeguro,
                rutaPrincipal: formData.rutaPrincipal,
            });
            setSelectedVehiculo({ 
                ...selectedVehiculo, 
                ...formData,
                id: selectedVehiculo.id // Keep the numeric ID
            });
            setIsEditing(false);
            setProfileTab('resumen');
        } else {
            if (!formData.id) return;
            addVehiculo({
                id: parseInt(formData.id),
                propietario: formData.propietario,
                patente: formData.patente,
                modelo: formData.modelo,
                anio: formData.anio,
                vencimientoRevisionTecnica: formData.vencimientoRevisionTecnica,
                vencimientoSeguro: formData.vencimientoSeguro,
                bloqueado: false,
                rutaPrincipal: formData.rutaPrincipal,
                variacionRuta: 'L',
                estadoCuenta: { deudas: 0, multas: 0 }
            });
            setShowAddForm(false);
        }
    };

    const toggleBloqueo = () => {
        if (!selectedVehiculo) return;
        const nextState = !selectedVehiculo.bloqueado;
        const updated = {
            ...selectedVehiculo,
            bloqueado: nextState,
            motivoBloqueo: nextState ? motivoBloqueo : undefined
        };
        updateVehiculo(updated);
        setSelectedVehiculo(updated);
    };

    const filteredVehiculos = vehiculos.filter(v => {
        const matchesRoute = v.rutaPrincipal === activeRouteTab;
        const matchesSearch = 
            v.id.toString().includes(searchTerm) || 
            v.patente.toLowerCase().includes(searchTerm.toLowerCase()) ||
            v.propietario.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesAnio = filterAnio === '' || v.anio.toString() === filterAnio;
        
        return matchesRoute && matchesSearch && matchesAnio;
    });

    return (
        <div className="space-y-6">
            <header className="flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-bold text-slate-800">Gestión de Vehículos</h2>
                    <p className="text-slate-500">Administración de la flota y cupos (1-250).</p>
                </div>
                <div className="flex gap-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input 
                            type="text" 
                            placeholder="Buscar cupo, patente..." 
                            className="pl-10 pr-4 py-2 border rounded-xl outline-none focus:ring-2 focus:ring-orange-500 bg-white"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <button 
                        onClick={() => exportVehiculos('csv')}
                        className="flex items-center gap-2 bg-white text-slate-700 px-3 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 transition font-bold text-xs"
                        title="Exportar como CSV"
                    >
                        <FileCode size={18} />
                        CSV
                    </button>
                    <button 
                        onClick={() => exportVehiculos('xlsx')}
                        className="flex items-center gap-2 bg-white text-slate-700 px-3 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 transition font-bold text-xs"
                        title="Exportar como Excel"
                    >
                        <FileText size={18} />
                        Excel
                    </button>
                    <button 
                        onClick={() => {
                            setShowAddForm(true);
                            setIsEditing(false);
                            setFormData({ id: '', propietario: '', patente: '', modelo: '', anio: 2024, vencimientoRevisionTecnica: '', vencimientoSeguro: '', rutaPrincipal: activeRouteTab });
                        }}
                        className="flex items-center gap-2 bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition font-bold"
                    >
                        <Plus size={20} />
                        Nuevo Vehículo
                    </button>
                </div>
            </header>

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                <div className="flex flex-wrap gap-4 items-center">
                    <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
                        {['Troncal', 'Variante 2'].map((route) => (
                            <button
                                key={route}
                                onClick={() => setActiveRouteTab(route as RutaPrincipal)}
                                className={`px-6 py-2 rounded-md text-sm font-bold transition-all ${activeRouteTab === route ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                {route}
                            </button>
                        ))}
                    </div>

                    <div className="flex items-center gap-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase">Año:</label>
                        <select 
                            value={filterAnio}
                            onChange={(e) => setFilterAnio(e.target.value)}
                            className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold outline-none focus:ring-1 focus:ring-orange-500"
                        >
                            <option value="">Todos</option>
                            {Array.from({ length: 30 }, (_, i) => new Date().getFullYear() - i).map(year => (
                                <option key={year} value={year}>{year}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-lg">
                    <button 
                        onClick={() => setViewMode('cards')}
                        className={`p-2 rounded-md transition-all ${viewMode === 'cards' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-500'}`}
                        title="Vista Tarjetas"
                    >
                        <LayoutGrid size={20} />
                    </button>
                    <button 
                        onClick={() => setViewMode('list')}
                        className={`p-2 rounded-md transition-all ${viewMode === 'list' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-500'}`}
                        title="Vista Lista"
                    >
                        <List size={20} />
                    </button>
                </div>
            </div>

            {viewMode === 'cards' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {filteredVehiculos.map(v => (
                        <div 
                            key={v.id} 
                            onClick={() => {
                                setSelectedVehiculo(v);
                                setProfileTab('resumen');
                                setFormData({
                                    id: v.id.toString(),
                                    propietario: v.propietario,
                                    patente: v.patente,
                                    modelo: v.modelo,
                                    anio: v.anio,
                                    vencimientoRevisionTecnica: v.vencimientoRevisionTecnica,
                                    vencimientoSeguro: v.vencimientoSeguro,
                                    rutaPrincipal: v.rutaPrincipal,
                                });
                            }}
                            className={`p-4 rounded-xl border-2 transition cursor-pointer group hover:border-orange-500 ${selectedVehiculo?.id === v.id ? 'border-orange-600 bg-orange-50' : 'bg-white border-slate-100 hover:shadow-md'}`}
                        >
                            <div className="flex justify-between items-start mb-2">
                                <span className="text-2xl font-black text-slate-800">#{v.id}</span>
                                {v.bloqueado ? <ShieldAlert className="text-red-500" size={20} /> : <ShieldCheck className="text-green-500" size={20} />}
                            </div>
                            <p className="font-bold text-slate-700 truncate">{v.modelo}</p>
                            <p className="text-xs text-slate-400 font-mono">{v.patente}</p>
                            <div className="mt-3 flex justify-between items-center">
                                 <span className="text-[10px] font-bold uppercase py-0.5 px-2 bg-slate-200 text-slate-600 rounded">{v.rutaPrincipal}</span>
                                 {v.estadoCuenta.deudas > 0 && <span className="text-[10px] font-black text-red-600">DEUDA PENDIENTE</span>}
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400">Cupo</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400">Vehículo</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400">Patente</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400">Propietario</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400">Conductor</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400">Estado</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400">Deuda</th>
                                <th className="px-6 py-4 text-right"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredVehiculos.map(v => {
                                const conductor = conductores.find(c => c.vehiculoId === v.id);
                                return (
                                    <tr 
                                        key={v.id} 
                                        onClick={() => {
                                            setSelectedVehiculo(v);
                                            setProfileTab('resumen');
                                            setFormData({
                                                id: v.id.toString(),
                                                propietario: v.propietario,
                                                patente: v.patente,
                                                modelo: v.modelo,
                                                anio: v.anio,
                                                vencimientoRevisionTecnica: v.vencimientoRevisionTecnica,
                                                vencimientoSeguro: v.vencimientoSeguro,
                                                rutaPrincipal: v.rutaPrincipal,
                                            });
                                        }}
                                        className="hover:bg-slate-50 transition cursor-pointer"
                                    >
                                        <td className="px-6 py-4">
                                            <span className="text-lg font-black text-slate-800">#{v.id}</span>
                                        </td>
                                        <td className="px-6 py-4 text-nowrap">
                                            <p className="font-bold text-slate-700">{v.modelo}</p>
                                            <p className="text-[10px] text-slate-400 uppercase font-bold">{v.anio}</p>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-xs font-mono bg-slate-100 px-2 py-1 rounded text-slate-600">{v.patente}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="text-sm text-slate-600 font-medium truncate max-w-[150px]">{v.propietario}</p>
                                        </td>
                                        <td className="px-6 py-4">
                                            {conductor ? (
                                                <div className="text-nowrap">
                                                    <p className="text-sm font-bold text-slate-700">{conductor.nombre}</p>
                                                    <p className="text-[10px] text-slate-400 font-mono">{conductor.rut}</p>
                                                </div>
                                            ) : (
                                                <span className="text-xs text-slate-400 italic">Sin asignar</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            {v.bloqueado ? (
                                                <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-red-100 text-red-700 text-[10px] font-black uppercase">
                                                    <ShieldAlert size={12} /> Bloqueado
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-green-100 text-green-700 text-[10px] font-black uppercase">
                                                    <ShieldCheck size={12} /> Habilitado
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className={`text-sm font-black ${v.estadoCuenta.deudas > 0 ? 'text-red-600' : 'text-slate-400'}`}>
                                                ${v.estadoCuenta.deudas.toLocaleString()}
                                            </p>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button className="text-slate-400 hover:text-orange-600 transition p-2">
                                                <Eye size={20} />
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {/* MODAL PERFIL */}
            {selectedVehiculo && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
                        <div className="bg-slate-900 p-6 text-white flex justify-between items-center shrink-0">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-orange-500 rounded-xl flex items-center justify-center font-black text-2xl">
                                    {selectedVehiculo.id}
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold">{selectedVehiculo.modelo}</h3>
                                    <p className="text-slate-400 text-xs font-mono">{selectedVehiculo.patente} • {selectedVehiculo.propietario}</p>
                                </div>
                            </div>
                            <button onClick={() => setSelectedVehiculo(null)} className="p-2 hover:bg-slate-800 rounded-full transition text-slate-400">
                                <X size={24} />
                            </button>
                        </div>

                        <div className="flex border-b shrink-0 bg-slate-50">
                            {[
                                { id: 'resumen', label: 'Resumen', icon: Eye },
                                { id: 'historial', label: 'Historial', icon: History },
                                { id: 'multas', label: 'Multas', icon: FileText },
                                { id: 'edicion', label: 'Editar / Bloqueos', icon: Edit3 }
                            ].map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setProfileTab(tab.id as any)}
                                    className={`flex-1 py-4 flex items-center justify-center gap-2 font-bold text-sm transition ${profileTab === tab.id ? 'text-orange-600 bg-white border-b-4 border-orange-600' : 'text-slate-500 hover:text-slate-700'}`}
                                >
                                    <tab.icon size={16} />
                                    <span className="hidden sm:inline">{tab.label}</span>
                                </button>
                            ))}
                        </div>

                        <div className="flex-1 overflow-y-auto p-8 bg-white">
                            {profileTab === 'resumen' && (
                                <div className="space-y-8">
                                    <div className="p-4 border-2 border-orange-100 rounded-2xl bg-orange-50/50 flex flex-col md:flex-row justify-between items-center gap-4">
                                        <div className="flex items-center gap-4 text-center md:text-left">
                                            <div className="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center text-white">
                                                <Car size={24} />
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-black text-orange-600 uppercase tracking-widest">Ruta Asignada hoy ({new Date().toLocaleDateString()})</p>
                                                <p className="text-2xl font-black text-orange-950">{formatRouteDisplay(selectedVehiculo)}</p>
                                            </div>
                                        </div>
                                        <div className="px-4 py-2 bg-white rounded-xl border border-orange-100 shadow-sm">
                                            <p className="text-[10px] font-black text-slate-400 uppercase">Base Operativa</p>
                                            <p className="font-bold text-slate-700">{selectedVehiculo.rutaPrincipal}</p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="p-4 border rounded-xl bg-slate-50/50">
                                            <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Conductor Actual</label>
                                            {conductores.find(c => c.vehiculoId === selectedVehiculo.id) ? (
                                                <div>
                                                    <p className="font-bold text-slate-800 text-lg">{conductores.find(c => c.vehiculoId === selectedVehiculo.id)?.nombre}</p>
                                                    <p className="text-xs text-slate-500 font-mono">{conductores.find(c => c.vehiculoId === selectedVehiculo.id)?.rut}</p>
                                                </div>
                                            ) : (
                                                <p className="text-slate-400 italic py-2">Sin conductor asignado</p>
                                            )}
                                        </div>
                                        <div className="p-4 border rounded-xl bg-slate-50/50">
                                            <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Estado de Cuenta</label>
                                            <div className="flex justify-between items-center">
                                                <p className={`text-xl font-black ${selectedVehiculo.estadoCuenta.deudas > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                                    $ {selectedVehiculo.estadoCuenta.deudas.toLocaleString()}
                                                </p>
                                                <span className="text-[10px] bg-slate-200 px-2 py-1 rounded font-bold">DEUDA ACUMULADA</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <h4 className="font-black text-xs uppercase text-slate-400 border-b pb-1 tracking-widest">Documentación</h4>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className={`p-4 border rounded-xl flex items-center gap-3 ${new Date(selectedVehiculo.vencimientoRevisionTecnica) < new Date() ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
                                                <div className={`w-3 h-3 rounded-full ${new Date(selectedVehiculo.vencimientoRevisionTecnica) < new Date() ? 'bg-red-500 animate-pulse' : 'bg-green-500'}`} />
                                                <div>
                                                    <p className="text-xs font-bold text-slate-500">Revisión Técnica</p>
                                                    <p className="font-bold">{selectedVehiculo.vencimientoRevisionTecnica}</p>
                                                </div>
                                            </div>
                                            <div className={`p-4 border rounded-xl flex items-center gap-3 ${new Date(selectedVehiculo.vencimientoSeguro) < new Date() ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
                                                <div className={`w-3 h-3 rounded-full ${new Date(selectedVehiculo.vencimientoSeguro) < new Date() ? 'bg-red-500 animate-pulse' : 'bg-green-500'}`} />
                                                <div>
                                                    <p className="text-xs font-bold text-slate-500">Seguro SOAP</p>
                                                    <p className="font-bold">{selectedVehiculo.vencimientoSeguro}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {selectedVehiculo.bloqueado && (
                                        <div className="p-4 bg-red-600 text-white rounded-xl shadow-lg shadow-red-200 flex items-center gap-4">
                                            <ShieldAlert size={32} />
                                            <div>
                                                <p className="font-black uppercase text-sm">Vehículo Bloqueado</p>
                                                <p className="text-red-100 text-xs italic">Motivo: {selectedVehiculo.motivoBloqueo || 'No especificado'}</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {profileTab === 'edicion' && (
                                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2">
                                    <form onSubmit={handleSave} className="grid grid-cols-2 gap-4">
                                        <div className="col-span-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase">Propietario del Cupo</label>
                                            <input type="text" value={formData.propietario} onChange={e => setFormData({...formData, propietario: e.target.value})} className="w-full p-3 border rounded-xl bg-slate-50 focus:ring-2 focus:ring-orange-500 outline-none font-bold" />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-black text-slate-400 uppercase">Patente</label>
                                            <input type="text" value={formData.patente} onChange={e => setFormData({...formData, patente: e.target.value})} className="w-full p-3 border rounded-xl bg-slate-50 focus:ring-2 focus:ring-orange-500 outline-none font-mono" />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-black text-slate-400 uppercase">Modelo</label>
                                            <input type="text" value={formData.modelo} onChange={e => setFormData({...formData, modelo: e.target.value})} className="w-full p-3 border rounded-xl bg-slate-50 focus:ring-2 focus:ring-orange-500 outline-none" />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-black text-slate-400 uppercase">Venc. Rev. Técnica</label>
                                            <input type="date" value={formData.vencimientoRevisionTecnica} onChange={e => setFormData({...formData, vencimientoRevisionTecnica: e.target.value})} className="w-full p-3 border rounded-xl bg-slate-50" />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-black text-slate-400 uppercase">Venc. Seguro</label>
                                            <input type="date" value={formData.vencimientoSeguro} onChange={e => setFormData({...formData, vencimientoSeguro: e.target.value})} className="w-full p-3 border rounded-xl bg-slate-50" />
                                        </div>
                                        <div className="col-span-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase">Ruta Principal Asignada</label>
                                            <select 
                                                value={formData.rutaPrincipal} 
                                                onChange={e => setFormData({...formData, rutaPrincipal: e.target.value as RutaPrincipal})} 
                                                className="w-full p-3 border rounded-xl bg-slate-50 focus:ring-2 focus:ring-orange-500 outline-none font-bold"
                                            >
                                                <option value="Troncal">Troncal</option>
                                                <option value="Variante 2">Variante 2</option>
                                            </select>
                                        </div>
                                        <div className="col-span-2 flex gap-4 mt-2">
                                            <button type="submit" className="flex-1 bg-slate-900 text-white p-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-black transition">
                                                <Save size={18} /> Actualizar Datos
                                            </button>
                                            <button 
                                                type="button"
                                                onClick={() => { if(confirm('¿Eliminar definitivamente este cupo?')) { removeVehiculo(selectedVehiculo.id); setSelectedVehiculo(null); } }}
                                                className="bg-red-50 text-red-600 p-3 rounded-xl hover:bg-red-100 transition"
                                            >
                                                <Trash2 size={20} />
                                            </button>
                                        </div>
                                    </form>

                                    <div className="pt-8 border-t space-y-4">
                                        <h4 className="font-black text-xs uppercase text-slate-400">Seguridad y Bloqueos</h4>
                                        <div className="p-6 border rounded-2xl bg-slate-50 space-y-4">
                                            <div>
                                                <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">Motivo de Bloqueo (Si aplica)</label>
                                                <select 
                                                    value={motivoBloqueo}
                                                    onChange={e => setMotivoBloqueo(e.target.value)}
                                                    className="w-full p-3 border rounded-xl bg-white focus:ring-2 focus:ring-orange-500 outline-none"
                                                >
                                                    {MOTIVOS_BLOQUEO.map(m => <option key={m} value={m}>{m}</option>)}
                                                </select>
                                            </div>
                                            <button 
                                                onClick={toggleBloqueo}
                                                className={`w-full py-4 rounded-xl font-black text-white flex items-center justify-center gap-3 transition shadow-lg ${selectedVehiculo.bloqueado ? 'bg-green-600 hover:bg-green-700 shadow-green-100' : 'bg-red-600 hover:bg-red-700 shadow-red-100'}`}
                                            >
                                                {selectedVehiculo.bloqueado ? (
                                                    <><ShieldCheck /> HABILITAR VENTA</>
                                                ) : (
                                                    <><ShieldAlert /> BLOQUEAR CUPO</>
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {profileTab === 'historial' && (
                                <div className="space-y-4">
                                     {conductores.flatMap(c => (c.historialVehiculos || [])
                                            .filter(h => h.vehiculoId === selectedVehiculo.id)
                                            .map(h => ({ ...h, conductorNombre: c.nombre }))
                                        )
                                        .sort((a, b) => new Date(b.fechaInicio).getTime() - new Date(a.fechaInicio).getTime())
                                        .map((h, idx) => (
                                            <div key={idx} className="flex justify-between items-center p-4 border rounded-xl hover:bg-slate-50 transition">
                                                <div>
                                                    <p className="font-bold text-slate-800">{h.conductorNombre}</p>
                                                    <p className="text-[10px] text-slate-400 font-mono uppercase tracking-widest">{h.conductorRut}</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Periodo Trabajado</p>
                                                    <p className="text-sm font-bold text-slate-600">{new Date(h.fechaInicio).toLocaleDateString()} - {h.fechaFin ? new Date(h.fechaFin).toLocaleDateString() : 'A la fecha'}</p>
                                                </div>
                                            </div>
                                        ))}
                                </div>
                            )}

                            {profileTab === 'multas' && (
                                <div className="space-y-3">
                                    {multas.filter(m => m.vehiculoId === selectedVehiculo.id).length > 0 ? (
                                        multas.filter(m => m.vehiculoId === selectedVehiculo.id)
                                            .sort((a,b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
                                            .map(m => (
                                                <div key={m.id} className={`p-4 rounded-xl border-l-4 ${m.pagada ? 'bg-green-50 border-green-500' : 'bg-red-50 border-red-500'} flex justify-between items-center shadow-sm`}>
                                                    <div>
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <span className="text-[10px] font-black text-slate-400 uppercase">{new Date(m.fecha).toLocaleDateString()}</span>
                                                            {!m.pagada && <span className="text-[9px] bg-red-600 text-white px-1.5 py-0.5 rounded font-black uppercase">Pendiente de Pago</span>}
                                                        </div>
                                                        <p className="font-bold text-slate-800">{m.motivo}</p>
                                                        <p className="text-[10px] text-slate-400 font-bold uppercase">{conductores.find(c => c.rut === m.conductorRut)?.nombre || 'S/N'}</p>
                                                    </div>
                                                    <p className={`font-black text-xl ${m.pagada ? 'text-green-600' : 'text-red-600'}`}>${m.monto.toLocaleString()}</p>
                                                </div>
                                            ))
                                    ) : (
                                        <div className="py-20 text-center space-y-4">
                                            <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto">
                                                <ShieldCheck className="text-slate-300" size={40} />
                                            </div>
                                            <p className="text-slate-400 font-bold">Sin infracciones registradas.</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* FORMULARIO AGREGAR */}
            {showAddForm && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl">
                        <div className="p-6 border-b flex justify-between items-center">
                            <h3 className="text-xl font-bold text-slate-800">Inscribir Nuevo Cupo/Vehículo</h3>
                            <button onClick={() => setShowAddForm(false)}><X /></button>
                        </div>
                        <form onSubmit={handleSave} className="p-6 grid grid-cols-2 gap-4">
                            <div className="col-span-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase">Nº de Línea (Cupo)</label>
                                <input type="number" required value={formData.id} onChange={e => setFormData({...formData, id: e.target.value})} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-orange-500 outline-none" placeholder="1-250" />
                            </div>
                            <div className="col-span-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase">Patente</label>
                                <input type="text" required value={formData.patente} onChange={e => setFormData({...formData, patente: e.target.value})} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-orange-500 outline-none font-mono" placeholder="ABCD-12" />
                            </div>
                            <div className="col-span-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase">Nombre Propietario</label>
                                <input type="text" required value={formData.propietario} onChange={e => setFormData({...formData, propietario: e.target.value})} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-orange-500 outline-none" />
                            </div>
                            <div className="col-span-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase">Modelo de Auto</label>
                                <input type="text" required value={formData.modelo} onChange={e => setFormData({...formData, modelo: e.target.value})} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-orange-500 outline-none" placeholder="Ej: Toyota Corolla" />
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase">Venc. Rev. Técnica</label>
                                <input type="date" required value={formData.vencimientoRevisionTecnica} onChange={e => setFormData({...formData, vencimientoRevisionTecnica: e.target.value})} className="w-full p-2 border rounded-lg" />
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase">Venc. Seguro</label>
                                <input type="date" required value={formData.vencimientoSeguro} onChange={e => setFormData({...formData, vencimientoSeguro: e.target.value})} className="w-full p-2 border rounded-lg" />
                            </div>
                            <div className="col-span-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase">Ruta Principal</label>
                                <select 
                                    value={formData.rutaPrincipal} 
                                    onChange={e => setFormData({...formData, rutaPrincipal: e.target.value as RutaPrincipal})} 
                                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                                >
                                    <option value="Troncal">Troncal</option>
                                    <option value="Variante 2">Variante 2</option>
                                </select>
                            </div>
                            <button type="submit" className="col-span-2 bg-slate-900 text-white font-bold py-3 rounded-xl mt-4 hover:bg-black transition">
                                Guardar Registro
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default GestionVehiculos;
