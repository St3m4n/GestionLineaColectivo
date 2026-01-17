import React, { useState } from 'react';
import { useStore } from '../contexts/StateContext';
import { Search, Printer, UserPlus, AlertCircle, CheckCircle2 } from 'lucide-react';

const InspectorView: React.FC = () => {
  const { 
    vehiculos, conductores, venderTarjeta, getDynamicVariacion, 
    registrarMulta, multas, levantarBloqueoTemporal, 
    printSettings 
  } = useStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'warning', text: string } | null>(null);
  const [showFinesForm, setShowFinesForm] = useState(false);
  const [showOverrideForm, setShowOverrideForm] = useState(false);
  const [overrideReason, setOverrideReason] = useState('');
  const [cantidadVenta, setCantidadVenta] = useState(1);
  const [lastCardsSold, setLastCardsSold] = useState<any[]>([]);
  const [fineData, setFineData] = useState({ 
    monto: '5000', 
    motivo: '', 
    tipo: 'vehiculo' as 'vehiculo' | 'conductor',
    fechaVencimiento: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] 
  });

  const foundVehiculo = vehiculos.find(v => v.id.toString() === searchTerm);
  const associatedConductor = foundVehiculo ? conductores.find(c => c.vehiculoId === foundVehiculo.id) : null;
  const currentVariacion = foundVehiculo ? getDynamicVariacion(foundVehiculo.id) : 'Normal';

  // Verificar multas vencidas
  const multasVencidas = foundVehiculo ? multas.filter(m => 
    m.vehiculoId === foundVehiculo.id && 
    !m.pagada && 
    m.fechaVencimiento && 
    new Date(m.fechaVencimiento) < new Date()
  ) : [];

  const isBlocked = foundVehiculo && (foundVehiculo.bloqueado || (associatedConductor?.bloqueado) || multasVencidas.length > 0);
  const isTemporarilyUnblocked = foundVehiculo?.desbloqueoTemporal?.activo;

  const handleVenta = () => {
    if (!foundVehiculo) return;
    const result = venderTarjeta(foundVehiculo.id, cantidadVenta);
    setMessage({ type: result.success ? 'success' : 'error', text: result.message });
    if (result.success) {
      setLastCardsSold((result as any).cards || []);
      setCantidadVenta(1);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <header className="no-print">
        <h2 className="text-3xl font-bold text-slate-800">Vista Inspector</h2>
        <p className="text-slate-500">Gestión de tarjetas de ruta y asociación de conductores.</p>
      </header>

      {/* Buscador */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 no-print">
        <label className="block text-sm font-medium text-slate-700 mb-2">Buscar Vehículo / Número de Línea</label>
        <div className="flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input
              type="text"
              placeholder="Ej: 101"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
            />
          </div>
        </div>
      </div>

      {message && (
        <div className={`p-4 rounded-lg flex items-center gap-3 no-print ${
          message.type === 'success' ? 'bg-green-50 text-green-700' : 
          message.type === 'warning' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
          'bg-red-50 text-red-700'}`}>
          {message.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
          <p>{message.text}</p>
        </div>
      )}

      {foundVehiculo ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 space-y-4 no-print">
            <h3 className="text-lg font-semibold border-b pb-2">Información del Vehículo</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <span className="text-slate-500">Número:</span> <span className="font-medium">{foundVehiculo.id}</span>
              <span className="text-slate-500">Propietario:</span> <span className="font-bold text-slate-800 uppercase text-[10px]">{foundVehiculo.propietario}</span>
              <span className="text-slate-500">Patente:</span> <span className="font-medium">{foundVehiculo.patente}</span>
              <span className="text-slate-500">Servicio Hoy:</span> <span className="font-bold text-orange-600 uppercase italic">{foundVehiculo.rutaPrincipal || 'N/A'} / {currentVariacion}</span>
              <span className="text-slate-500">Multas Vencidas:</span> <span className={`font-bold ${multasVencidas.length > 0 ? 'text-red-600' : 'text-green-600'}`}>{multasVencidas.length}</span>
              <span className="text-slate-500">Deudas Pendientes:</span> <span className="font-bold text-red-600">${foundVehiculo.estadoCuenta?.deudas?.toLocaleString() || '0'}</span>
              <span className="text-slate-500">Estado:</span> 
              <span className={`font-bold ${isBlocked && !isTemporarilyUnblocked ? 'text-red-500' : 'text-green-500'}`}>
                {isBlocked ? (isTemporarilyUnblocked ? 'DESBLOQUEO TEMP.' : 'BLOQUEADO') : 'HABILITADO'}
              </span>
            </div>

            {isBlocked && !isTemporarilyUnblocked ? (
              <div className="space-y-3">
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-xs text-red-700 font-bold mb-1 uppercase text-center">⛔ Venta deshabilitada</p>
                  <p className="text-[10px] text-red-600 italic text-center">
                    {multasVencidas.length > 0 ? `Existen ${multasVencidas.length} multas con plazo de pago vencido.` : 'Bloqueo administrativo activo.'}
                  </p>
                </div>
                
                {!showOverrideForm ? (
                  <button 
                    onClick={() => setShowOverrideForm(true)}
                    className="w-full bg-slate-800 text-white text-xs font-bold py-2 rounded-lg hover:bg-black transition"
                  >
                    Lifting Administrativo (Urgencia)
                  </button>
                ) : (
                  <div className="p-3 border-2 border-orange-500 rounded-lg bg-orange-50 space-y-2">
                    <label className="text-[10px] font-black text-orange-700 uppercase">Motivo del desbloqueo temporal</label>
                    <input 
                      type="text" 
                      placeholder="Ej: Compromiso de pago tarde"
                      className="w-full p-2 text-xs border rounded outline-none"
                      value={overrideReason}
                      onChange={e => setOverrideReason(e.target.value)}
                    />
                    <div className="flex gap-2">
                      <button 
                        onClick={() => {
                          if(!overrideReason) return alert('Indique un motivo');
                          levantarBloqueoTemporal(foundVehiculo.id, overrideReason);
                          setShowOverrideForm(false);
                          setMessage({ type: 'warning', text: 'Bloqueo levantado solo para una venta.' });
                        }}
                        className="flex-1 bg-orange-600 text-white text-[10px] font-bold py-1.5 rounded"
                      >
                        Autorizar
                      </button>
                      <button 
                        onClick={() => setShowOverrideForm(false)}
                        className="flex-1 bg-slate-200 text-slate-600 text-[10px] font-bold py-1.5 rounded"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase">Cantidad de Tarjetas</label>
                    <input 
                      type="number" 
                      min="1" 
                      max="31"
                      className="w-full p-2 border-2 border-slate-100 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none font-bold text-lg"
                      value={cantidadVenta}
                      onChange={e => setCantidadVenta(parseInt(e.target.value) || 1)}
                    />
                  </div>
                  <div className="flex-1 pt-4 text-right">
                    <p className="text-[10px] text-slate-400 uppercase font-bold text-right">Total a Pagar</p>
                    <p className="text-2xl font-black text-slate-800">${(cantidadVenta * 2500).toLocaleString()}</p>
                  </div>
                </div>
                <button
                  onClick={handleVenta}
                  className="w-full flex items-center justify-center gap-2 bg-orange-600 hover:bg-orange-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-orange-200 transition-all active:scale-95 disabled:bg-slate-300"
                >
                  <Printer size={20} />
                  Emitir {cantidadVenta} Tarjeta(s)
                </button>
              </div>
            )}
            
            {isTemporarilyUnblocked && (
              <p className="p-2 bg-green-50 border border-green-200 text-green-700 text-[10px] font-bold text-center rounded">
                AUTORIZACIÓN TEMPORAL: {foundVehiculo.desbloqueoTemporal?.motivo}
              </p>
            )}

            <button
              onClick={() => setShowFinesForm(!showFinesForm)}
              className="w-full mt-2 text-xs font-bold text-red-600 hover:underline"
            >
              {showFinesForm ? 'Cancelar Reporte' : '⚠️ Reportar Infracción / Multar'}
            </button>

            {showFinesForm && (
              <div className="mt-4 p-4 bg-red-50 border border-red-100 rounded-lg space-y-3">
                <p className="text-xs font-black text-red-700 uppercase">Registrar Infracción</p>
                
                <div className="flex gap-2 mb-2">
                  <button 
                    onClick={() => setFineData({...fineData, tipo: 'vehiculo'})}
                    className={`flex-1 py-1 px-2 rounded text-[10px] font-bold border transition ${fineData.tipo === 'vehiculo' ? 'bg-red-600 text-white border-red-600' : 'bg-white text-red-600 border-red-200'}`}
                  >
                    MULTA VEHÍCULO
                  </button>
                  <button 
                    onClick={() => setFineData({...fineData, tipo: 'conductor'})}
                    className={`flex-1 py-1 px-2 rounded text-[10px] font-bold border transition ${fineData.tipo === 'conductor' ? 'bg-red-600 text-white border-red-600' : 'bg-white text-red-600 border-red-200'}`}
                  >
                    MULTA CONDUCTOR
                  </button>
                </div>

                <input 
                  type="text" 
                  placeholder={fineData.tipo === 'vehiculo' ? "Ej: Letrero en mal estado" : "Ej: Exceso de velocidad"} 
                  className="w-full p-2 text-sm border rounded bg-white shadow-inner"
                  value={fineData.motivo}
                  onChange={e => setFineData({...fineData, motivo: e.target.value})}
                />
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Monto</label>
                    <input 
                      type="number" 
                      placeholder="Monto" 
                      className="w-full p-2 text-sm border rounded bg-white shadow-inner"
                      value={fineData.monto}
                      onChange={e => setFineData({...fineData, monto: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Plazo de Pago</label>
                    <input 
                      type="date" 
                      className="w-full p-2 text-sm border rounded bg-white shadow-inner"
                      value={fineData.fechaVencimiento}
                      onChange={e => setFineData({...fineData, fechaVencimiento: e.target.value})}
                    />
                  </div>
                </div>
                <button 
                  onClick={() => {
                    if(!fineData.motivo) return alert('Debe indicar un motivo');
                    if(!associatedConductor) return alert('Debe haber un conductor asociado para aplicar una multa');
                    registrarMulta(
                      foundVehiculo.id, 
                      associatedConductor.rut, 
                      parseInt(fineData.monto), 
                      fineData.motivo,
                      fineData.tipo,
                      fineData.fechaVencimiento
                    );
                    setShowFinesForm(false);
                    setFineData({ 
                      monto: '5000', 
                      motivo: '', 
                      tipo: 'vehiculo', 
                      fechaVencimiento: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] 
                    });
                    setMessage({ type: 'success', text: `Multa registrada al ${fineData.tipo} correctamente.` });
                  }}
                  className="w-full bg-red-600 text-white text-xs font-bold py-2 rounded hover:bg-red-700 transition"
                >
                  Confirmar Sanción
                </button>
              </div>
            )}
          </div>

          {/* Conductor Asociado */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 space-y-4 no-print">
            <h3 className="text-lg font-semibold border-b pb-2">Conductor Asociado</h3>
            {associatedConductor ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <span className="text-slate-500">Nombre:</span> <span className="font-medium">{associatedConductor.nombre}</span>
                  <span className="text-slate-500">RUT:</span> <span className="font-medium">{associatedConductor.rut}</span>
                  <span className="text-slate-500">Licencia:</span> <span className="font-medium">{associatedConductor.vencimientoLicencia}</span>
                </div>
                {associatedConductor.bloqueado && (
                  <div className="mt-2 p-2 bg-red-50 border border-red-100 rounded text-red-600 text-xs">
                    <strong>Motivo Bloqueo:</strong> {associatedConductor.motivoBloqueo}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-32 text-slate-400">
                <UserPlus size={40} className="mb-2" />
                <p>Sin conductor asociado</p>
              </div>
            )}
          </div>

          {/* Tarjeta de Ruta Preview */}
          {foundVehiculo && (
            <div className="md:col-span-2 space-y-4">
              {lastCardsSold.length > 0 && (
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 no-print bg-orange-50 p-4 rounded-xl border border-orange-200">
                  <div>
                    <h3 className="text-lg font-black text-orange-800 uppercase tracking-tight">Venta Exitosa</h3>
                    <p className="text-xs text-orange-600 font-bold">Las tarjetas están listas para ser impresas en el papel pre-impreso.</p>
                  </div>
                  <button 
                    onClick={() => window.print()}
                    className="w-full md:w-auto flex items-center justify-center gap-2 bg-slate-900 text-white px-8 py-4 rounded-xl font-black hover:bg-black transition-all shadow-lg active:scale-95"
                  >
                    <Printer size={20} />
                    IMPRIMIR {lastCardsSold.length} TICKET(S)
                  </button>
                </div>
              )}

              <div id="print-area" className="space-y-6 mode-preprinted">
                {(lastCardsSold.length > 0 ? lastCardsSold : [{
                  id: 0,
                  folio: `F-XXXXXX-${foundVehiculo.id}`,
                  vehiculoId: foundVehiculo.id,
                  fechaEmision: new Date().toISOString(),
                  fechaUso: new Date().toISOString(),
                  variacion: currentVariacion,
                  valor: 2500,
                  nombreConductor: associatedConductor?.nombre || 'S/N'
                }]).map((ticket, idx) => (
                  <div key={ticket.id || idx} className="ticket-print bg-white p-8 rounded-xl shadow-lg border-2 border-dashed border-slate-300 relative overflow-hidden">
                    {/* Indicador de copia (no se imprime) */}
                    <div className="absolute top-0 right-0 bg-orange-500 text-white text-[10px] font-black px-3 py-1 rounded-bl-lg uppercase no-print">
                      Tarjeta {idx + 1} de {lastCardsSold.length || 1}
                    </div>

                    <div className="flex justify-between items-start border-b-2 border-slate-800 pb-4 mb-6 header-section">
                      <div>
                        <h4 className="text-2xl font-black uppercase tracking-tighter label-fixed">Tarjeta de Ruta</h4>
                        <p className="text-sm font-mono text-slate-500 label-fixed">LINEA 8 - TAXIS COLECTIVOS</p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-red-600 relative">
                          <span className="label-fixed">Folio: </span>
                          <span className="value-dynamic" style={{ position: 'absolute', top: printSettings.folio.top, left: printSettings.folio.left, fontSize: printSettings.folio.fontSize }}>{ticket.folio}</span>
                        </p>
                        <p className="text-xs text-slate-500 relative">
                          <span className="label-fixed">Emisión: </span>
                          <span className="value-dynamic" style={{ position: 'absolute', top: printSettings.fechaEmision.top, left: printSettings.fechaEmision.left, fontSize: printSettings.fechaEmision.fontSize }}>{new Date(ticket.fechaEmision).toLocaleDateString()}</span>
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-4 gap-8 py-4 data-section">
                      <div className="field-group relative">
                        <p className="text-[10px] uppercase text-slate-500 mb-1 label-fixed">Vehículo</p>
                        <p className="text-2xl font-black value-dynamic" style={{ position: 'absolute', top: printSettings.vehiculoId.top, left: printSettings.vehiculoId.left, fontSize: printSettings.vehiculoId.fontSize }}>#{ticket.vehiculoId}</p>
                        <p className="text-sm value-dynamic label-fixed">{foundVehiculo?.patente}</p>
                      </div>
                      <div className="field-group relative">
                        <p className="text-[10px] uppercase text-slate-500 mb-1 label-fixed">Válida Para</p>
                        <p className="text-lg font-black uppercase value-dynamic" style={{ position: 'absolute', top: printSettings.fechaUso.top, left: printSettings.fechaUso.left, fontSize: printSettings.fechaUso.fontSize }}>{new Date(ticket.fechaUso).toLocaleDateString()}</p>
                        <p className="text-sm uppercase text-orange-600 font-black value-dynamic" style={{ position: 'absolute', top: printSettings.variacion.top, left: printSettings.variacion.left, fontSize: printSettings.variacion.fontSize }}>{ticket.variacion}</p>
                      </div>
                      <div className="field-group col-span-1 relative">
                        <p className="text-[10px] uppercase text-slate-500 mb-1 label-fixed">Conductor</p>
                        <p className="text-sm font-bold value-dynamic" style={{ position: 'absolute', top: printSettings.conductor.top, left: printSettings.conductor.left, fontSize: printSettings.conductor.fontSize }}>{ticket.nombreConductor}</p>
                      </div>
                      <div className="text-right field-group">
                        <p className="text-[10px] uppercase text-slate-500 mb-1 label-fixed">Valor</p>
                        <p className="text-2xl font-black value-dynamic label-fixed">${ticket.valor.toLocaleString()}</p>
                      </div>
                    </div>

                    <div className="mt-8 pt-4 border-t border-slate-200 text-center footer-section">
                      <p className="text-[10px] text-slate-400 italic label-fixed">
                        {lastCardsSold.length > 0 ? 'Venta confirmada. Mantener en lugar visible.' : 'Vista previa de impresión.'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : searchTerm && (
        <div className="bg-amber-50 p-8 rounded-xl text-center border border-amber-200 animate-pulse">
          <p className="text-amber-800 font-medium">No se encontró ningún vehículo con el número "{searchTerm}"</p>
        </div>
      )}
    </div>
  );
};

export default InspectorView;
