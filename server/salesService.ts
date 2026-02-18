import { JsonFileStore } from './persistence.js';
import type {
  AuditoriaAsignacion,
  AuditoriaDesbloqueo,
  Conductor,
  CrearVentaPayload,
  FullState,
  Multa,
  PrintSettings,
  Vehiculo,
  VentaTarjeta,
} from './types.js';

const VEHICULOS_FILE = 'vehiculos.json';
const CONDUCTORES_FILE = 'conductores.json';
const MULTAS_FILE = 'multas.json';
const AUDITORIA_DESBLOQUEOS_FILE = 'auditoria_desbloqueos.json';
const AUDITORIA_ASIGNACIONES_FILE = 'auditoria_asignaciones.json';
const PRINT_SETTINGS_FILE = 'print_settings.json';
const DIAS_NO_HABILES_FILE = 'dias_no_habiles.json';
const ASIGNACIONES_R_FILE = 'asignaciones_r.json';

const DEFAULT_PRINT_SETTINGS: PrintSettings = {
  folio: { top: 20, left: 350, fontSize: 18 },
  fechaEmision: { top: 45, left: 350, fontSize: 12 },
  fechaUso: { top: 120, left: 160, fontSize: 18 },
  vehiculoId: { top: 120, left: 20, fontSize: 24 },
  patente: { top: 155, left: 20, fontSize: 14 },
  conductor: { top: 120, left: 250, fontSize: 14 },
  variacion: { top: 155, left: 160, fontSize: 14 },
  valor: { top: 120, left: 380, fontSize: 24 },
};

const normalizeDateOnly = (value: string): string => {
  const d = new Date(`${value}T12:00:00`);
  if (Number.isNaN(d.getTime())) {
    throw new Error('fechaUso inválida. Use formato YYYY-MM-DD');
  }

  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const shardFor = (dateOnly: string): string => {
  const [year, month] = dateOnly.split('-');
  return `ventas_${year}_${month}.json`;
};

const getDateOnlyFromIso = (iso: string): string => normalizeDateOnly(iso.slice(0, 10));

export class SalesService {
  constructor(private readonly store: JsonFileStore) {}

  getVehiculos(): Vehiculo[] {
    return this.store.readArrayFile<Vehiculo>(VEHICULOS_FILE);
  }

  private saveVehiculos(data: Vehiculo[]): void {
    this.store.writeArrayFileAtomic(VEHICULOS_FILE, data);
  }

  private getConductores(): Conductor[] {
    return this.store.readArrayFile<Conductor>(CONDUCTORES_FILE);
  }

  private getMultas(): Multa[] {
    return this.store.readArrayFile<Multa>(MULTAS_FILE);
  }

  private readTarjetasAllShards(): VentaTarjeta[] {
    const files = this.store.listFilesByPrefix('ventas_');
    if (files.length === 0) return [];

    const all: VentaTarjeta[] = [];
    for (const file of files) {
      const items = this.store.readArrayFile<VentaTarjeta>(file);
      all.push(...items);
    }

    return all.sort((a, b) => new Date(a.fechaEmision).getTime() - new Date(b.fechaEmision).getTime());
  }

  private writeTarjetasSharded(tarjetas: VentaTarjeta[]): void {
    const grouped = new Map<string, VentaTarjeta[]>();
    for (const t of tarjetas) {
      const dateOnly = getDateOnlyFromIso(t.fechaUso);
      const shard = shardFor(dateOnly);
      const arr = grouped.get(shard) || [];
      arr.push(t);
      grouped.set(shard, arr);
    }

    grouped.forEach((items, shard) => {
      this.store.writeArrayFileAtomic(shard, items);
    });
  }

  getFullState(): FullState {
    return {
      vehiculos: this.getVehiculos(),
      conductores: this.getConductores(),
      tarjetas: this.readTarjetasAllShards(),
      multas: this.getMultas(),
      auditoriaDesbloqueos: this.store.readArrayFile<AuditoriaDesbloqueo>(AUDITORIA_DESBLOQUEOS_FILE),
      auditoriaAsignaciones: this.store.readArrayFile<AuditoriaAsignacion>(AUDITORIA_ASIGNACIONES_FILE),
      printSettings: this.store.readObjectFile<PrintSettings>(PRINT_SETTINGS_FILE, DEFAULT_PRINT_SETTINGS),
      diasNoHabiles: this.store.readArrayFile<string>(DIAS_NO_HABILES_FILE),
      asignacionesR: this.store.readObjectFile<Record<string, number[]>>(ASIGNACIONES_R_FILE, {}),
    };
  }

  saveFullState(payload: FullState): void {
    this.store.writeArrayFileAtomic(VEHICULOS_FILE, payload.vehiculos || []);
    this.store.writeArrayFileAtomic(CONDUCTORES_FILE, payload.conductores || []);
    this.store.writeArrayFileAtomic(MULTAS_FILE, payload.multas || []);
    this.store.writeArrayFileAtomic(AUDITORIA_DESBLOQUEOS_FILE, payload.auditoriaDesbloqueos || []);
    this.store.writeArrayFileAtomic(AUDITORIA_ASIGNACIONES_FILE, payload.auditoriaAsignaciones || []);
    this.store.writeObjectFileAtomic(PRINT_SETTINGS_FILE, payload.printSettings || DEFAULT_PRINT_SETTINGS);
    this.store.writeArrayFileAtomic(DIAS_NO_HABILES_FILE, payload.diasNoHabiles || []);
    this.store.writeObjectFileAtomic(ASIGNACIONES_R_FILE, payload.asignacionesR || {});
    this.writeTarjetasSharded(payload.tarjetas || []);
  }

  private getDynamicVariacion(vehiculoId: number, vehiculos: Vehiculo[], asignacionesR: Record<string, number[]>, baseDate?: Date): 'T' | 'L' | 'R' {
    const today = baseDate || new Date();
    const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    if (asignacionesR && Object.prototype.hasOwnProperty.call(asignacionesR, dateStr)) {
      if ((asignacionesR[dateStr] || []).includes(vehiculoId)) return 'R';
    } else {
      const epoch = new Date(2024, 0, 1);
      const diffDays = Math.floor(Math.abs(today.getTime() - epoch.getTime()) / (1000 * 60 * 60 * 24));

      const troncales = vehiculos.filter(v => v.rutaPrincipal === 'Troncal' || !v.rutaPrincipal).sort((a,b) => a.id - b.id);
      const variante2s = vehiculos.filter(v => v.rutaPrincipal === 'Variante 2').sort((a,b) => a.id - b.id);

      if (troncales.length > 0) {
        const startIdx = (diffDays * 8) % troncales.length;
        for (let i = 0; i < 8; i++) {
          if (troncales[(startIdx + i) % troncales.length].id === vehiculoId) return 'R';
        }
      }

      if (variante2s.length > 0) {
        const startIdx = (diffDays * 8) % variante2s.length;
        for (let i = 0; i < 8; i++) {
          if (variante2s[(startIdx + i) % variante2s.length].id === vehiculoId) return 'R';
        }
      }
    }

    return (today.getMonth() % 2 === 0) ? 'L' : 'T';
  }

  getVentasShard(year: string, month: string): VentaTarjeta[] {
    const shardName = `ventas_${year}_${month.padStart(2, '0')}.json`;
    return this.store.readArrayFile<VentaTarjeta>(shardName);
  }

  venderTarjeta(payload: CrearVentaPayload): { success: boolean; message: string; cards?: VentaTarjeta[] } {
    const vehiculos = this.getVehiculos();
    const conductores = this.getConductores();
    const multas = this.getMultas();
    const asignacionesR = this.store.readObjectFile<Record<string, number[]>>(ASIGNACIONES_R_FILE, {});

    const vehiculo = vehiculos.find(v => v.id === payload.vehiculoId);
    if (!vehiculo) return { success: false, message: 'Vehículo no encontrado' };

    const conductor = conductores.find(c => c.vehiculoId === payload.vehiculoId);
    if (!conductor) return { success: false, message: 'No hay conductor asociado a este vehículo' };

    if ((vehiculo.bloqueado || conductor.bloqueado) && !vehiculo.desbloqueoTemporal?.activo) {
      return { success: false, message: 'Venta bloqueada por administración.' };
    }

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const fechaLicencia = new Date(`${conductor.vencimientoLicencia}T12:00:00`);
    if (fechaLicencia.getTime() < hoy.getTime() && !vehiculo.desbloqueoTemporal?.activo) {
      return { success: false, message: `Bloqueado: Licencia del conductor (${conductor.nombre}) venció el ${conductor.vencimientoLicencia}.` };
    }

    const multasVencidas = multas.filter(m =>
      m.vehiculoId === payload.vehiculoId && !m.pagada && m.fechaVencimiento && new Date(`${m.fechaVencimiento}T12:00:00`).getTime() < Date.now(),
    );

    if (multasVencidas.length > 0 && !vehiculo.desbloqueoTemporal?.activo) {
      return { success: false, message: `Bloqueado por ${multasVencidas.length} multas vencidas.` };
    }

    const todayStr = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;
    const targetDates = (payload.fechasUso && payload.fechasUso.length > 0 ? payload.fechasUso : [todayStr]).map(normalizeDateOnly);

    const datesByShard = new Map<string, string[]>();
    for (const d of targetDates) {
      const shard = shardFor(d);
      const existing = datesByShard.get(shard) || [];
      existing.push(d);
      datesByShard.set(shard, existing);
    }

    for (const [shard, dates] of datesByShard) {
      const current = this.store.readArrayFile<VentaTarjeta>(shard);
      const duplicate = dates.some(dateOnly => current.some(v => v.vehiculoId === payload.vehiculoId && getDateOnlyFromIso(v.fechaUso) === dateOnly));
      if (duplicate) return { success: false, message: 'Una o más fechas ya tienen una tarjeta emitida.' };
    }

    const createdByShard = new Map<string, VentaTarjeta[]>();
    const now = new Date();
    const cards: VentaTarjeta[] = targetDates.map((dateOnly, index) => {
      const fechaUso = new Date(`${dateOnly}T12:00:00`);
      const variacion = this.getDynamicVariacion(payload.vehiculoId, vehiculos, asignacionesR, fechaUso);
      const ticket: VentaTarjeta = {
        id: Date.now() + index,
        folio: `F-${Math.floor(1000 + Math.random() * 9000)}-${payload.vehiculoId}`,
        vehiculoId: payload.vehiculoId,
        nombreConductor: conductor.nombre,
        fechaEmision: now.toISOString(),
        fechaUso: fechaUso.toISOString(),
        variacion,
        valor: 2500,
      };

      const shard = shardFor(dateOnly);
      const list = createdByShard.get(shard) || [];
      list.push(ticket);
      createdByShard.set(shard, list);
      return ticket;
    });

    createdByShard.forEach((newCards, shard) => {
      const current = this.store.readArrayFile<VentaTarjeta>(shard);
      this.store.writeArrayFileAtomic(shard, [...current, ...newCards]);
    });

    const totalVenta = 2500 * targetDates.length;
    const updatedVehiculos = vehiculos.map(v =>
      v.id === payload.vehiculoId
        ? {
            ...v,
            estadoCuenta: {
              ...v.estadoCuenta,
              deudas: Math.max(0, (v.estadoCuenta?.deudas || 0) - totalVenta),
            },
            desbloqueoTemporal: undefined,
          }
        : v,
    );
    this.saveVehiculos(updatedVehiculos);

    return {
      success: true,
      message: `${targetDates.length} tarjeta(s) vendida(s) con éxito.`,
      cards,
    };
  }
}