import React, { useState, useEffect } from 'react';
import { useStore } from '../contexts/StateContext';
import { Search, Printer, UserPlus, AlertCircle, CheckCircle2, ChevronLeft, ChevronRight } from 'lucide-react';

const InspectorView: React.FC = () => {
  const { 
    vehiculos, conductores, venderTarjeta, getDynamicVariacion, 
    registrarMulta, multas, levantarBloqueoTemporal, 
    printSettings, tarjetas, diasNoHabiles 
  } = useStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'warning', text: string } | null>(null);
  const [showFinesForm, setShowFinesForm] = useState(false);
  const [showOverrideForm, setShowOverrideForm] = useState(false);
  const [overrideReason, setOverrideReason] = useState('');
  
  // Función para obtener fecha local en formato YYYY-MM-DD
  const getLocalDateStr = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Debounce para la búsqueda
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 600);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [isReissue, setIsReissue] = useState(false);

  const [lastCardsSold, setLastCardsSold] = useState<any[]>([]);

  const [fineData, setFineData] = useState({ 
    monto: '5000', 
    motivo: '', 
    tipo: 'vehiculo' as 'vehiculo' | 'conductor',
    fechaVencimiento: getLocalDateStr(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000))
  });

  const foundVehiculo = vehiculos.find(v => v.id.toString() === debouncedSearch);
  const associatedConductor = foundVehiculo ? conductores.find(c => c.vehiculoId === foundVehiculo.id) : null;
  const currentVariacion = foundVehiculo ? getDynamicVariacion(foundVehiculo.id) : 'Normal';

  // Verificar multas vencidas
  const multasVencidas = foundVehiculo ? multas.filter(m => 
    m.vehiculoId === foundVehiculo.id && 
    !m.pagada && 
    m.fechaVencimiento && 
    new Date(m.fechaVencimiento + 'T12:00:00') < new Date()
  ) : [];

  const isBlocked = foundVehiculo && (foundVehiculo.bloqueado || (associatedConductor?.bloqueado) || multasVencidas.length > 0);
  const isTemporarilyUnblocked = foundVehiculo?.desbloqueoTemporal?.activo;

  // Resetear selección al cambiar de vehículo o detectar si hoy está disponible
  useEffect(() => {
    if (foundVehiculo) {
      const todayStr = getLocalDateStr(new Date());
      const isTodaySold = tarjetas.some(t => t.vehiculoId === foundVehiculo.id && t.fechaUso?.split('T')[0] === todayStr);
      const isTodayNonWork = diasNoHabiles.includes(todayStr);
      
      // Auto-seleccionar hoy si no está vendido y es día hábil
      if (!isTodaySold && !isTodayNonWork) {
        setSelectedDates([todayStr]);
      } else {
        setSelectedDates([]);
      }
    } else {
      setSelectedDates([]);
    }
    setLastCardsSold([]);
    setIsReissue(false);
    setMessage(null);
  }, [debouncedSearch, foundVehiculo?.id]); // Solo dependemos del ID o del debouncedSearch para no resetear al vender o cambiar días no hábiles en medio de la vista

  // Autodisparar impresión al recibir tarjetas
  useEffect(() => {
    if (lastCardsSold.length > 0) {
      const timer = setTimeout(() => {
        window.print();
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [lastCardsSold]);

  const handleVenta = () => {
    if (!foundVehiculo) return;
    if (selectedDates.length === 0) return setMessage({ type: 'error', text: 'Debe seleccionar al menos un día.' });
    
    const result = venderTarjeta(foundVehiculo.id, selectedDates);
    if (result.success) {
      setIsReissue(false);
      setLastCardsSold((result as any).cards || []);
      setSelectedDates([]); // Limpiar selección tras venta
      setMessage({ type: 'success', text: result.message });
    } else {
      setMessage({ type: 'error', text: result.message });
    }
  };

  // Lógica del mini-calendario
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const daysCount = new Date(year, month + 1, 0).getDate();
    const days = [];
    for (let i = 1; i <= daysCount; i++) {
      days.push(getLocalDateStr(new Date(year, month, i)));
    }
    return days;
  };

  const toggleDate = (dateStr: string, isSold: boolean) => {
    if (isSold) {
      const ticket = tarjetas.find(t => t.vehiculoId === foundVehiculo?.id && t.fechaUso?.split('T')[0] === dateStr);
      if (ticket) {
        setIsReissue(true);
        setLastCardsSold([ticket]);
        // Si clickeamos un vendido, quitamos cualquier selección de nuevos días para evitar confusión
        setSelectedDates([]);
      }
      return;
    }

    if (selectedDates.includes(dateStr)) {
      setSelectedDates(selectedDates.filter(d => d !== dateStr));
    } else {
      // Si empezamos a seleccionar días nuevos, quitamos la vista de "reimpresión"
      setIsReissue(false);
      setLastCardsSold([]); 
      setSelectedDates([...selectedDates, dateStr]);
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
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="text-xs font-black uppercase text-slate-500">Calendario de Ventas</h4>
                    <div className="flex gap-2">
                      <button onClick={() => setCurrentMonth(new Date(currentMonth.setMonth(currentMonth.getMonth() - 1)))} className="p-1 hover:bg-slate-200 rounded"><ChevronLeft size={16} /></button>
                      <span className="text-xs font-bold w-24 text-center uppercase">{currentMonth.toLocaleString('default', { month: 'short', year: 'numeric' })}</span>
                      <button onClick={() => setCurrentMonth(new Date(currentMonth.setMonth(currentMonth.getMonth() + 1)))} className="p-1 hover:bg-slate-200 rounded"><ChevronRight size={16} /></button>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-7 gap-1 text-center mb-2">
                    {['L','M','M','J','V','S','D'].map(d => <span key={d} className="text-[10px] font-black text-slate-400">{d}</span>)}
                  </div>
                  
                  <div className="grid grid-cols-7 gap-1">
                    {/* Padding inicial para el primer día de la semana (ajustado para que Lunes sea 0) */}
                    {Array.from({ length: (new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay() + 6) % 7 }).map((_, i) => <div key={`pad-${i}`} />)}
                    
                    {getDaysInMonth(currentMonth).map(dateStr => {
                      const isSold = tarjetas.some(t => t.vehiculoId === foundVehiculo.id && t.fechaUso?.split('T')[0] === dateStr);
                      const isNonWork = diasNoHabiles.includes(dateStr);
                      const isSelected = selectedDates.includes(dateStr);
                      const isToday = dateStr === getLocalDateStr(new Date());
                      const dayNumber = parseInt(dateStr.split('-')[2]);
                      
                      return (
                        <button
                          key={dateStr}
                          title={isNonWork ? 'Día No Mábil' : isToday ? 'HOY' : isSold ? 'Ya vendido - Click para reimprimir' : ''}
                          disabled={isNonWork}
                          onClick={() => toggleDate(dateStr, isSold)}
                          className={`
                            h-8 rounded-lg text-xs font-bold transition-all relative group
                            ${isToday ? 'ring-2 ring-emerald-500 ring-offset-2 z-30 shadow-sm' : ''}
                            ${isNonWork ? 'bg-slate-100 text-slate-300 cursor-not-allowed opacity-50' :
                              isSelected ? 'bg-orange-600 text-white shadow-md scale-110' : 
                              isSold ? 'bg-orange-100 text-orange-600 border border-orange-200 cursor-help' : 
                              'bg-white hover:bg-orange-50 border border-slate-100'}
                          `}
                        >
                          {dayNumber}
                          {isToday && (
                            <div className="absolute -top-1 -right-1 flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                            </div>
                          )}
                          {isSold && (
                            <span className="invisible group-hover:visible absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[8px] px-2 py-1 rounded whitespace-nowrap z-50 shadow-xl">
                              VENDIDO - REIMPRIMIR
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex items-center justify-between px-2">
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase font-bold">Días Seleccionados</p>
                    <p className="text-lg font-black text-slate-800">{selectedDates.length}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-slate-400 uppercase font-bold">Total Venta</p>
                    <p className="text-xl font-black text-orange-600">${(selectedDates.length * 2500).toLocaleString()}</p>
                  </div>
                </div>

                <button
                  onClick={handleVenta}
                  disabled={selectedDates.length === 0}
                  className="w-full flex items-center justify-center gap-2 bg-orange-600 hover:bg-orange-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-orange-200 transition-all active:scale-95 disabled:bg-slate-200 disabled:text-slate-400"
                >
                  <Printer size={20} />
                  Emitir {selectedDates.length} Tarjeta(s)
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
                    {isReissue ? 'REIMPRIMIR' : 'IMPRIMIR'} {lastCardsSold.length} TICKET(S)
                  </button>
                </div>
              )}

              <div id="print-area" className="hidden print:block mode-preprinted">
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
                    <div className="absolute top-0 right-0 bg-slate-900 text-white text-[10px] font-black px-3 py-1 rounded-bl-lg uppercase no-print">
                      COPIA {idx + 1}
                    </div>

                    <div className="flex justify-between items-start border-b border-slate-100 pb-4 mb-6 header-section">
                      <div>
                        {/* Headers eliminados para modo pre-impreso */}
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-red-600 relative min-h-[1.5em]">
                          <span className="value-dynamic" style={{ position: 'absolute', top: printSettings.folio.top, left: printSettings.folio.left, fontSize: printSettings.folio.fontSize }}>{ticket.folio}</span>
                        </p>
                        <p className="text-xs text-slate-500 relative min-h-[1em]">
                          <span className="value-dynamic" style={{ position: 'absolute', top: printSettings.fechaEmision.top, left: printSettings.fechaEmision.left, fontSize: printSettings.fechaEmision.fontSize }}>{new Date(ticket.fechaEmision).toLocaleDateString()}</span>
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-4 gap-8 py-4 data-section">
                      <div className="field-group relative min-h-[4em]">
                        <p className="text-2xl font-black value-dynamic" style={{ position: 'absolute', top: printSettings.vehiculoId.top, left: printSettings.vehiculoId.left, fontSize: printSettings.vehiculoId.fontSize }}>#{ticket.vehiculoId}</p>
                        <p className="text-sm value-dynamic">{foundVehiculo?.patente}</p>
                      </div>
                      <div className="field-group relative min-h-[4em]">
                        <p className="text-lg font-black uppercase value-dynamic" style={{ position: 'absolute', top: printSettings.fechaUso.top, left: printSettings.fechaUso.left, fontSize: printSettings.fechaUso.fontSize }}>{new Date(ticket.fechaUso).toLocaleDateString()}</p>
                        <p className="text-sm uppercase text-orange-600 font-black value-dynamic" style={{ position: 'absolute', top: printSettings.variacion.top, left: printSettings.variacion.left, fontSize: printSettings.variacion.fontSize }}>{ticket.variacion}</p>
                      </div>
                      <div className="field-group col-span-1 relative min-h-[4em]">
                        <p className="text-sm font-bold value-dynamic" style={{ position: 'absolute', top: printSettings.conductor.top, left: printSettings.conductor.left, fontSize: printSettings.conductor.fontSize }}>{ticket.nombreConductor}</p>
                      </div>
                      <div className="text-right field-group">
                        <p className="text-2xl font-black value-dynamic">${ticket.valor.toLocaleString()}</p>
                      </div>
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
