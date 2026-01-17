import React, { useState } from 'react';
import { useStore } from '../contexts/StateContext';
import { Plus, UserPlus, Car, Trash2, Edit3, Users } from 'lucide-react';
import type { RutaPrincipal, VariacionRuta, Vehiculo, Conductor } from '../types';

const GestionCRUD: React.FC = () => {
    const { vehiculos, addVehiculo, removeVehiculo, conductores, addConductor, removeConductor } = useStore();
    const [activeTab, setActiveTab] = useState<'vehiculos' | 'conductores'>('vehiculos');

    const [showVehiculoForm, setShowVehiculoForm] = useState(false);
    const [showConductorForm, setShowConductorForm] = useState(false);

    // Form states
    const [newVehiculo, setNewVehiculo] = useState({
        id: '',
        propietario: '',
        patente: '',
        modelo: '',
        anio: new Date().getFullYear(),
        vencimientoRevisionTecnica: '',
        vencimientoSeguro: '',
        rutaPrincipal: 'Troncal' as RutaPrincipal,
        variacionRuta: 'Normal' as VariacionRuta
    });

    const [newConductor, setNewConductor] = useState({
        rut: '',
        nombre: '',
        vencimientoLicencia: '',
        vehiculoId: ''
    });

    const [editingVehiculo, setEditingVehiculo] = useState<Vehiculo | null>(null);
    const [editingConductor, setEditingConductor] = useState<Conductor | null>(null);

    const { updateVehiculo, updateConductor } = useStore();

    const handleAddVehiculo = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newVehiculo.id || parseInt(newVehiculo.id) < 1 || parseInt(newVehiculo.id) > 250) {
            alert('El número de línea debe estar entre 1 y 250');
            return;
        }

        if (editingVehiculo) {
            updateVehiculo({
                ...editingVehiculo,
                propietario: newVehiculo.propietario,
                patente: newVehiculo.patente,
                modelo: newVehiculo.modelo,
                anio: newVehiculo.anio,
                vencimientoRevisionTecnica: newVehiculo.vencimientoRevisionTecnica,
                vencimientoSeguro: newVehiculo.vencimientoSeguro,
                rutaPrincipal: newVehiculo.rutaPrincipal,
            });
            setEditingVehiculo(null);
        } else {
            addVehiculo({
                id: parseInt(newVehiculo.id),
                propietario: newVehiculo.propietario,
                patente: newVehiculo.patente,
                modelo: newVehiculo.modelo,
                anio: newVehiculo.anio,
                vencimientoRevisionTecnica: newVehiculo.vencimientoRevisionTecnica,
                vencimientoSeguro: newVehiculo.vencimientoSeguro,
                bloqueado: false,
                rutaPrincipal: newVehiculo.rutaPrincipal,
                variacionRuta: 'Normal',
                estadoCuenta: { deudas: 0, multas: 0 }
            });
        }
        setShowVehiculoForm(false);
        setNewVehiculo({ id: '', propietario: '', patente: '', modelo: '', anio: 2024, vencimientoRevisionTecnica: '', vencimientoSeguro: '', rutaPrincipal: 'Troncal', variacionRuta: 'Normal' });
    };

    const handleAddConductor = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingConductor) {
            updateConductor({
                ...editingConductor,
                nombre: newConductor.nombre,
                vencimientoLicencia: newConductor.vencimientoLicencia,
                vehiculoId: newConductor.vehiculoId ? parseInt(newConductor.vehiculoId) : undefined,
            });
            setEditingConductor(null);
        } else {
            addConductor({
                rut: newConductor.rut,
                nombre: newConductor.nombre,
                vencimientoLicencia: newConductor.vencimientoLicencia,
                vehiculoId: newConductor.vehiculoId ? parseInt(newConductor.vehiculoId) : undefined,
                bloqueado: false
            });
        }
        setShowConductorForm(false);
        setNewConductor({ rut: '', nombre: '', vencimientoLicencia: '', vehiculoId: '' });
    };

    return (
        <div className="space-y-8">
            <header>
                <h2 className="text-3xl font-bold text-slate-800">Gestión de Base de Datos</h2>
                <p className="text-slate-500">Administra los registros de la flota y el padrón de conductores.</p>
            </header>

            {/* Tabs */}
            <div className="flex gap-4 border-b border-slate-200">
                <button
                    onClick={() => setActiveTab('vehiculos')}
                    className={`flex items-center gap-2 pb-4 px-4 font-medium transition ${activeTab === 'vehiculos' ? 'border-b-2 border-orange-500 text-orange-600' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    <Car size={18} />
                    Vehículos (Flota)
                </button>
                <button
                    onClick={() => setActiveTab('conductores')}
                    className={`flex items-center gap-2 pb-4 px-4 font-medium transition ${activeTab === 'conductores' ? 'border-b-2 border-orange-500 text-orange-600' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    <Users size={18} />
                    Conductores
                </button>
            </div>

            {activeTab === 'vehiculos' ? (
                <section className="space-y-6">
                    <div className="flex justify-between items-center">
                        <h3 className="text-xl font-bold text-slate-700">Listado de Vehículos</h3>
                        <button
                            onClick={() => {
                                setEditingVehiculo(null);
                                setNewVehiculo({ id: '', propietario: '', patente: '', modelo: '', anio: 2024, vencimientoRevisionTecnica: '', vencimientoSeguro: '', rutaPrincipal: 'Troncal', variacionRuta: 'Normal' });
                                setShowVehiculoForm(!showVehiculoForm);
                            }}
                            className="flex items-center gap-2 bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition"
                        >
                            <Plus size={18} />
                            {showVehiculoForm ? 'Cerrar Formulario' : 'Agregar Vehículo'}
                        </button>
                    </div>

                    {showVehiculoForm && (
                        <form onSubmit={handleAddVehiculo} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 items-end">
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-500 uppercase">Nº de Línea (Cupo 1-250)</label>
                                <input type="number" min="1" max="250" required disabled={!!editingVehiculo} value={newVehiculo.id} onChange={e => setNewVehiculo({ ...newVehiculo, id: e.target.value })} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-orange-500 outline-none disabled:bg-slate-100" placeholder="Ej: 15" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-500 uppercase">Propietario del Cupo</label>
                                <input type="text" required value={newVehiculo.propietario} onChange={e => setNewVehiculo({ ...newVehiculo, propietario: e.target.value })} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-orange-500 outline-none" placeholder="Don Pedro" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-500 uppercase">Patente</label>
                                <input type="text" required value={newVehiculo.patente} onChange={e => setNewVehiculo({ ...newVehiculo, patente: e.target.value })} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-orange-500 outline-none" placeholder="XXXX-00" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-500 uppercase">Modelo</label>
                                <input type="text" required value={newVehiculo.modelo} onChange={e => setNewVehiculo({ ...newVehiculo, modelo: e.target.value })} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-orange-500 outline-none" placeholder="Ej: Toyota Yaris" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-500 uppercase">Venc. Rev. Técnica</label>
                                <input type="date" required value={newVehiculo.vencimientoRevisionTecnica} onChange={e => setNewVehiculo({ ...newVehiculo, vencimientoRevisionTecnica: e.target.value })} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-orange-500 outline-none" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-500 uppercase">Venc. Seguro</label>
                                <input type="date" required value={newVehiculo.vencimientoSeguro} onChange={e => setNewVehiculo({ ...newVehiculo, vencimientoSeguro: e.target.value })} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-orange-500 outline-none" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-500 uppercase">Ruta Principal</label>
                                <select value={newVehiculo.rutaPrincipal} onChange={e => setNewVehiculo({ ...newVehiculo, rutaPrincipal: e.target.value as RutaPrincipal })} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-orange-500 outline-none">
                                    <option value="Troncal">Troncal</option>
                                    <option value="Variante">Variante</option>
                                </select>
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-500 uppercase">Variación Ruta</label>
                                <select value={newVehiculo.variacionRuta} onChange={e => setNewVehiculo({ ...newVehiculo, variacionRuta: e.target.value as VariacionRuta })} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-orange-500 outline-none">
                                    <option value="Normal">Normal</option>
                                    <option value="L">Por L</option>
                                    <option value="R">R</option>
                                </select>
                            </div>
                            <div className="bg-orange-50 p-3 rounded-lg border border-orange-200 text-xs text-orange-800 lg:col-span-4">
                                <strong>Nota:</strong> La variación de la ruta (L, R o Normal) se calcula automáticamente según el calendario y el sorteo diario. Aquí solo defines si el vehículo es Troncal o Variante por defecto.
                            </div>
                            <button type="submit" className="bg-slate-900 text-white p-2 rounded-lg hover:bg-black transition font-bold">Guardar</button>
                        </form>
                    )}

                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 text-slate-500 text-xs font-bold uppercase tracking-wider">
                                <tr>
                                    <th className="px-6 py-4 text-center">Nº Línea</th>
                                    <th className="px-6 py-4">Vehículo</th>
                                    <th className="px-6 py-4">Ruta / Variante</th>
                                    <th className="px-6 py-4">Estado Cuenta</th>
                                    <th className="px-6 py-4 text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 italic">
                                {vehiculos.map(v => (
                                    <tr key={v.id} className="hover:bg-slate-50 transition">
                                        <td className="px-6 py-4 text-center">
                                            <span className="inline-block bg-orange-100 text-orange-700 font-black px-3 py-1 rounded-full">{v.id}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="font-bold text-slate-800">{v.modelo}</p>
                                            <p className="text-[10px] text-slate-400 font-bold uppercase">{v.propietario}</p>
                                            <p className="text-xs text-slate-500 font-mono">{v.patente}</p>
                                        </td>
                                        <td className="px-6 py-4 uppercase text-xs font-bold">
                                            <span className="text-slate-800">{v.rutaPrincipal}</span>
                                            <span className="text-slate-400 mx-1">/</span>
                                            <span className="text-orange-600">{v.variacionRuta}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            {v.estadoCuenta.deudas > 0 ? (
                                                <p className="text-xs text-red-600 font-bold">Debe: ${v.estadoCuenta.deudas.toLocaleString()}</p>
                                            ) : (
                                                <p className="text-xs text-green-600 font-bold">Al día</p>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right space-x-2">
                                            <button
                                                onClick={() => {
                                                    setEditingVehiculo(v);
                                                    setNewVehiculo({
                                                        id: v.id.toString(),
                                                        propietario: v.propietario,
                                                        patente: v.patente,
                                                        modelo: v.modelo,
                                                        anio: v.anio,
                                                        vencimientoRevisionTecnica: v.vencimientoRevisionTecnica,
                                                        vencimientoSeguro: v.vencimientoSeguro,
                                                        rutaPrincipal: v.rutaPrincipal,
                                                        variacionRuta: v.variacionRuta
                                                    });
                                                    setShowVehiculoForm(true);
                                                }}
                                                className="text-slate-400 hover:text-blue-600 p-1"
                                            >
                                                <Edit3 size={18} />
                                            </button>
                                            <button
                                                onClick={() => { if (confirm('¿Eliminar vehículo?')) removeVehiculo(v.id); }}
                                                className="text-slate-400 hover:text-red-600 p-1"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>
            ) : (
                <section className="space-y-6">
                    <div className="flex justify-between items-center">
                        <h3 className="text-xl font-bold text-slate-700">Padrón de Conductores</h3>
                        <button
                            onClick={() => {
                                setEditingConductor(null);
                                setNewConductor({ rut: '', nombre: '', vencimientoLicencia: '', vehiculoId: '' });
                                setShowConductorForm(!showConductorForm);
                            }}
                            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
                        >
                            <UserPlus size={18} />
                            {showConductorForm ? 'Cerrar Formulario' : 'Agregar Conductor'}
                        </button>
                    </div>

                    {showConductorForm && (
                        <form onSubmit={handleAddConductor} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-500 uppercase">RUT</label>
                                <input type="text" required disabled={!!editingConductor} value={newConductor.rut} onChange={e => setNewConductor({ ...newConductor, rut: e.target.value })} className="w-full p-2 border rounded-lg disabled:bg-slate-100" placeholder="12.345.678-9" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-500 uppercase">Nombre Completo</label>
                                <input type="text" required value={newConductor.nombre} onChange={e => setNewConductor({ ...newConductor, nombre: e.target.value })} className="w-full p-2 border rounded-lg" placeholder="Juan Pérez" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-500 uppercase">Venc. Licencia</label>
                                <input type="date" required value={newConductor.vencimientoLicencia} onChange={e => setNewConductor({ ...newConductor, vencimientoLicencia: e.target.value })} className="w-full p-2 border rounded-lg" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-500 uppercase">Asociar a Nº Línea</label>
                                <select value={newConductor.vehiculoId} onChange={e => setNewConductor({ ...newConductor, vehiculoId: e.target.value })} className="w-full p-2 border rounded-lg">
                                    <option value="">Ninguno</option>
                                    {vehiculos.map(v => <option key={v.id} value={v.id}>#{v.id} ({v.patente})</option>)}
                                </select>
                            </div>
                            <button type="submit" className="bg-slate-900 text-white p-2 rounded-lg hover:bg-black transition font-bold lg:col-span-1">Guardar</button>
                        </form>
                    )}

                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 text-slate-500 text-xs font-bold uppercase tracking-wider">
                                <tr>
                                    <th className="px-6 py-4">Nombre</th>
                                    <th className="px-6 py-4">RUT</th>
                                    <th className="px-6 py-4">Vehículo Asociado</th>
                                    <th className="px-6 py-4">Venc. Licencia</th>
                                    <th className="px-6 py-4 text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {conductores.map(c => (
                                    <tr key={c.rut} className="hover:bg-slate-50 transition">
                                        <td className="px-6 py-4 font-medium text-slate-800">{c.nombre}</td>
                                        <td className="px-6 py-4 text-slate-500 font-mono">{c.rut}</td>
                                        <td className="px-6 py-4">
                                            {c.vehiculoId ? (
                                                <span className="bg-slate-100 text-slate-800 px-2 py-1 rounded text-xs font-bold">Línea #{c.vehiculoId}</span>
                                            ) : (
                                                <span className="text-slate-300 italic text-xs">No asignado</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-600 italic">
                                            {c.vencimientoLicencia}
                                        </td>
                                        <td className="px-6 py-4 text-right space-x-2">
                                            <button
                                                onClick={() => {
                                                    setEditingConductor(c);
                                                    setNewConductor({
                                                        rut: c.rut,
                                                        nombre: c.nombre,
                                                        vencimientoLicencia: c.vencimientoLicencia,
                                                        vehiculoId: c.vehiculoId?.toString() || ''
                                                    });
                                                    setShowConductorForm(true);
                                                }}
                                                className="text-slate-400 hover:text-blue-600 p-1"
                                            >
                                                <Edit3 size={18} />
                                            </button>
                                            <button
                                                onClick={() => { if (confirm('¿Eliminar conductor?')) removeConductor(c.rut); }}
                                                className="text-slate-400 hover:text-red-600 p-1"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>
            )}
        </div>
    );
};

export default GestionCRUD;
