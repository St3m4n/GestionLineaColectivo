import React, { useEffect, useState } from 'react';
import { UserCheck, Save } from 'lucide-react';
import type { Controlador } from '../types';
import { useStore } from '../contexts/StateContext';

const GestionControladores: React.FC = () => {
  const { controlador, updateControlador } = useStore();

  const [formData, setFormData] = useState<Controlador>({
    nombre: '',
    rut: '',
    telefono: '',
    email: '',
    observaciones: ''
  });

  useEffect(() => {
    if (controlador) {
      setFormData({
        nombre: controlador.nombre || '',
        rut: controlador.rut || '',
        telefono: controlador.telefono || '',
        email: controlador.email || '',
        observaciones: controlador.observaciones || ''
      });
    }
  }, [controlador]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nombre.trim() || !formData.rut.trim()) {
      alert('Nombre y RUT del controlador son obligatorios.');
      return;
    }

    updateControlador({
      ...formData,
      nombre: formData.nombre.trim(),
      rut: formData.rut.trim()
    });

    alert('Perfil de controlador guardado correctamente.');
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <header>
        <h2 className="text-3xl font-bold text-slate-800">Ficha de Controlador</h2>
        <p className="text-slate-500">Perfil único del controlador de ruta (vueltas).</p>
      </header>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-6 border-b bg-slate-50 flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
            <UserCheck size={22} />
          </div>
          <div>
            <h3 className="font-black text-slate-800">Controlador en Ruta</h3>
            <p className="text-xs text-slate-500">Este perfil se imprime en la hoja de ruta.</p>
          </div>
        </div>

        <form onSubmit={handleSave} className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="text-[10px] font-black text-slate-400 uppercase">Nombre</label>
            <input
              type="text"
              required
              value={formData.nombre}
              onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
              className="w-full p-3 border rounded-xl bg-slate-50 focus:ring-2 focus:ring-indigo-500 outline-none font-bold"
              placeholder="Ej: María Pérez"
            />
          </div>

          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase">RUT</label>
            <input
              type="text"
              required
              value={formData.rut}
              onChange={(e) => setFormData({ ...formData, rut: e.target.value })}
              className="w-full p-3 border rounded-xl bg-slate-50 focus:ring-2 focus:ring-indigo-500 outline-none font-mono"
              placeholder="12.345.678-9"
            />
          </div>

          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase">Teléfono</label>
            <input
              type="text"
              value={formData.telefono || ''}
              onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
              className="w-full p-3 border rounded-xl bg-slate-50 focus:ring-2 focus:ring-indigo-500 outline-none"
              placeholder="+56 9 xxxx xxxx"
            />
          </div>

          <div className="md:col-span-2">
            <label className="text-[10px] font-black text-slate-400 uppercase">Email</label>
            <input
              type="email"
              value={formData.email || ''}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full p-3 border rounded-xl bg-slate-50 focus:ring-2 focus:ring-indigo-500 outline-none"
              placeholder="controlador@linea8.cl"
            />
          </div>

          <div className="md:col-span-2">
            <label className="text-[10px] font-black text-slate-400 uppercase">Observaciones</label>
            <textarea
              value={formData.observaciones || ''}
              onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
              className="w-full p-3 border rounded-xl bg-slate-50 focus:ring-2 focus:ring-indigo-500 outline-none min-h-[110px]"
              placeholder="Turno, tramo de control, notas operativas..."
            />
          </div>

          <div className="md:col-span-2 pt-2">
            <button
              type="submit"
              className="w-full md:w-auto bg-slate-900 text-white px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-black transition"
            >
              <Save size={18} /> Guardar Perfil
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default GestionControladores;
