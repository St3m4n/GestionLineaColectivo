import React, { useState } from 'react';
import { useStore } from '../contexts/StateContext';
import { ShieldAlert, ShieldCheck, AlertTriangle } from 'lucide-react';

const GestionBloqueos: React.FC = () => {
  const { conductores, updateConductor, vehiculos, updateVehiculo } = useStore();
  const [activeTab, setActiveTab ] = useState<'conductores' | 'vehiculos'>('conductores');

  const MOTIVOS_BLOQUEO = [
    'Suspensión Administrativa',
    'Licencia de Conducir Vencida',
    'Revisión Técnica Vencida',
    'Seguro Obligatorio Vencido',
    'Multas Pendientes',
    'Comportamiento Indebido',
    'Falta de Uniforme',
    'Ruta No Autorizada',
    'Otro'
  ];

  const [motivoSeleccionado, setMotivoSeleccionado] = useState(MOTIVOS_BLOQUEO[0]);

  const toggleConductor = (rut: string, current: boolean) => {
    const conductor = conductores.find(c => c.rut === rut);
    if (!conductor) return;
    
    updateConductor({
      ...conductor,
      bloqueado: !current,
      motivoBloqueo: !current ? motivoSeleccionado : undefined
    });
  };

  const toggleVehiculo = (id: number, current: boolean) => {
    const vehiculo = vehiculos.find(v => v.id === id);
    if (!vehiculo) return;

    updateVehiculo({
      ...vehiculo,
      bloqueado: !current,
      motivoBloqueo: !current ? motivoSeleccionado : undefined
    });
  };

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-3xl font-bold text-slate-800">Gestión de Bloqueos</h2>
        <p className="text-slate-500">Habilita o deshabilita la venta de tarjetas por incumplimiento.</p>
      </header>

      <div className="flex gap-4 border-b border-slate-200">
        <button 
          onClick={() => setActiveTab('conductores')}
          className={`pb-4 px-2 font-medium transition ${activeTab === 'conductores' ? 'border-b-2 border-orange-500 text-orange-600' : 'text-slate-500 hover:text-slate-700'}`}
        >
          Conductores
        </button>
        <button 
          onClick={() => setActiveTab('vehiculos')}
          className={`pb-4 px-2 font-medium transition ${activeTab === 'vehiculos' ? 'border-b-2 border-orange-500 text-orange-600' : 'text-slate-500 hover:text-slate-700'}`}
        >
          Vehículos
        </button>
      </div>

      <div className="bg-orange-50 p-4 rounded-xl border border-orange-200 flex flex-col md:flex-row items-center gap-4">
        <div className="flex items-center gap-2 text-orange-800 font-bold">
          <AlertTriangle size={20} />
          <span>Motivo del Bloqueo:</span>
        </div>
        <select 
          value={motivoSeleccionado}
          onChange={(e) => setMotivoSeleccionado(e.target.value)}
          className="flex-1 p-2 border border-orange-300 rounded-lg bg-white outline-none focus:ring-2 focus:ring-orange-500"
        >
          {MOTIVOS_BLOQUEO.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
        <p className="text-[10px] text-orange-600 italic max-w-xs text-center md:text-left">
          Seleccione el motivo antes de presionar el botón de bloqueo para el conductor o vehículo.
        </p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {activeTab === 'conductores' ? (
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 text-xs font-semibold uppercase text-slate-500 tracking-wider">Nombre / RUT</th>
                <th className="px-6 py-4 text-xs font-semibold uppercase text-slate-500 tracking-wider">Estado</th>
                <th className="px-6 py-4 text-xs font-semibold uppercase text-slate-500 tracking-wider">Motivo</th>
                <th className="px-6 py-4 text-xs font-semibold uppercase text-slate-500 tracking-wider">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {conductores.map(c => (
                <tr key={c.rut}>
                  <td className="px-6 py-4">
                    <p className="font-bold text-slate-800">{c.nombre}</p>
                    <p className="text-xs text-slate-400">{c.rut}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${c.bloqueado ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                      {c.bloqueado ? <ShieldAlert size={12} /> : <ShieldCheck size={12} />}
                      {c.bloqueado ? 'Bloqueado' : 'Activo'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600 italic">
                    {c.bloqueado ? c.motivoBloqueo : 'N/A'}
                  </td>
                  <td className="px-6 py-4">
                    <button 
                      onClick={() => toggleConductor(c.rut, c.bloqueado)}
                      className={`px-4 py-2 rounded-lg text-xs font-bold transition ${c.bloqueado ? 'bg-green-600 text-white hover:bg-green-700' : 'bg-red-100 text-red-600 hover:bg-red-200'}`}
                    >
                      {c.bloqueado ? 'Desbloquear' : 'Bloquear'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 text-xs font-semibold uppercase text-slate-500 tracking-wider">Número / Patente</th>
                <th className="px-6 py-4 text-xs font-semibold uppercase text-slate-500 tracking-wider">Estado</th>
                <th className="px-6 py-4 text-xs font-semibold uppercase text-slate-500 tracking-wider">Motivo</th>
                <th className="px-6 py-4 text-xs font-semibold uppercase text-slate-500 tracking-wider">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {vehiculos.map(v => (
                <tr key={v.id}>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="font-bold text-slate-800">#{v.id}</span>
                      <span className="text-[10px] font-black text-orange-600 uppercase">Cupo: {v.propietario}</span>
                      <span className="text-xs text-slate-400">{v.patente}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${v.bloqueado ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                      {v.bloqueado ? <ShieldAlert size={12} /> : <ShieldCheck size={12} />}
                      {v.bloqueado ? 'Bloqueado' : 'Habilitado'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600 italic">
                    {v.bloqueado ? v.motivoBloqueo : 'N/A'}
                  </td>
                  <td className="px-6 py-4">
                    <button 
                      onClick={() => toggleVehiculo(v.id, v.bloqueado)}
                      className={`px-4 py-2 rounded-lg text-xs font-bold transition ${v.bloqueado ? 'bg-green-600 text-white hover:bg-green-700' : 'bg-red-100 text-red-600 hover:bg-red-200'}`}
                    >
                      {v.bloqueado ? 'Desbloquear' : 'Bloquear'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="p-4 bg-orange-50 border border-orange-100 rounded-lg flex gap-3 text-orange-800 text-sm">
        <AlertTriangle className="shrink-0" size={20} />
        <p><strong>Nota:</strong> Al bloquear a un conductor o vehículo, el sistema impedirá automáticamente la venta de tarjetas de ruta en la vista de Inspector hasta que se revierta la acción.</p>
      </div>
    </div>
  );
};

export default GestionBloqueos;
