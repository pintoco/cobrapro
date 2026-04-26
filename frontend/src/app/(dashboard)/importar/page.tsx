'use client';

import { useState, useRef } from 'react';
import {
  UploadCloud, Download, FileSpreadsheet,
  AlertCircle, CheckCircle2, XCircle, RefreshCw,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { importApi } from '@/lib/api';

type ImportType = 'clients' | 'invoices';

interface DryRunResult {
  total: number;
  valid: number;
  errors: number;
  errorDetails: { row: number; errors: string[] }[];
  dryRun: boolean;
}

interface ImportResult {
  total: number;
  imported: number;
  skipped: number;
}

export default function ImportarPage() {
  const [tab, setTab] = useState<ImportType>('clients');
  const [file, setFile] = useState<File | null>(null);
  const [dryResult, setDryResult] = useState<DryRunResult | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setFile(null);
    setDryResult(null);
    setImportResult(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleTabChange = (newTab: ImportType) => {
    setTab(newTab);
    reset();
  };

  const handleDownloadTemplate = async () => {
    try {
      const response =
        tab === 'clients'
          ? await importApi.clientsTemplate()
          : await importApi.invoicesTemplate();
      const blob = new Blob([response.data as ArrayBuffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download =
        tab === 'clients' ? 'plantilla_clientes.xlsx' : 'plantilla_facturas.xlsx';
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Error al descargar plantilla');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    setFile(f);
    setDryResult(null);
    setImportResult(null);
  };

  const handleDryRun = async () => {
    if (!file) return toast.error('Seleccione un archivo');
    setLoading(true);
    try {
      const response =
        tab === 'clients'
          ? await importApi.importClients(file, true)
          : await importApi.importInvoices(file, true);
      const result = response.data.data as DryRunResult;
      setDryResult(result);
      if (result.errors > 0) {
        toast.error(`${result.errors} filas con errores. Corrija antes de importar.`);
      } else {
        toast.success(`${result.valid} registros listos para importar`);
      }
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Error al procesar archivo');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmImport = async () => {
    if (!file || !dryResult || dryResult.errors > 0) return;
    setConfirming(true);
    try {
      const response =
        tab === 'clients'
          ? await importApi.importClients(file, false)
          : await importApi.importInvoices(file, false);
      const result = response.data.data as ImportResult;
      setImportResult(result);
      setDryResult(null);
      toast.success(response.data.message || 'Importación completada');
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Error al importar');
    } finally {
      setConfirming(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      {/* Info banner */}
      <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
        <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-amber-700">
          La importación Excel está disponible solo en planes <strong>Pro</strong> y{' '}
          <strong>Empresa</strong>.
        </p>
      </div>

      {/* Tabs */}
      <div className="card p-1 flex gap-1 max-w-xs">
        {(['clients', 'invoices'] as ImportType[]).map((t) => (
          <button
            key={t}
            onClick={() => handleTabChange(t)}
            className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
              tab === t ? 'bg-brand-600 text-white' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            {t === 'clients' ? 'Clientes' : 'Facturas'}
          </button>
        ))}
      </div>

      {/* Template download */}
      <div className="card p-5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center flex-shrink-0">
            <FileSpreadsheet className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <p className="font-medium text-gray-800 text-sm">
              Plantilla de {tab === 'clients' ? 'clientes' : 'facturas'}
            </p>
            <p className="text-xs text-gray-500">
              Descargue la plantilla Excel con el formato requerido
            </p>
          </div>
        </div>
        <button onClick={handleDownloadTemplate} className="btn-secondary flex-shrink-0">
          <Download className="w-4 h-4" /> Descargar
        </button>
      </div>

      {/* Upload */}
      <div className="card p-5 space-y-4">
        <h2 className="text-sm font-semibold text-gray-700">Subir archivo Excel</h2>
        <div
          className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center hover:border-brand-400 transition-colors cursor-pointer"
          onClick={() => fileInputRef.current?.click()}
        >
          <UploadCloud className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          {file ? (
            <>
              <p className="text-sm font-medium text-gray-700">{file.name}</p>
              <p className="text-xs text-gray-400 mt-1">
                {(file.size / 1024).toFixed(1)} KB
              </p>
            </>
          ) : (
            <>
              <p className="text-sm text-gray-500">Haga clic para seleccionar archivo</p>
              <p className="text-xs text-gray-400 mt-1">.xlsx, .xls</p>
            </>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>

        <div className="flex gap-3">
          {file && (
            <button onClick={reset} className="btn-secondary">
              <XCircle className="w-4 h-4" /> Limpiar
            </button>
          )}
          <button onClick={handleDryRun} disabled={!file || loading} className="btn-primary">
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" /> Procesando...
              </>
            ) : (
              <>
                <FileSpreadsheet className="w-4 h-4" /> Validar archivo
              </>
            )}
          </button>
        </div>
      </div>

      {/* Dry run result */}
      {dryResult && (
        <div className="card p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700">Resultado de validación</h2>
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 bg-gray-50 rounded-lg text-center">
              <p className="text-2xl font-bold text-gray-900">{dryResult.total}</p>
              <p className="text-xs text-gray-500 mt-1">Total filas</p>
            </div>
            <div className="p-3 bg-green-50 rounded-lg text-center">
              <p className="text-2xl font-bold text-green-600">{dryResult.valid}</p>
              <p className="text-xs text-gray-500 mt-1">Válidas</p>
            </div>
            <div className="p-3 bg-red-50 rounded-lg text-center">
              <p className="text-2xl font-bold text-red-600">{dryResult.errors}</p>
              <p className="text-xs text-gray-500 mt-1">Con errores</p>
            </div>
          </div>

          {dryResult.errorDetails.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-red-600 mb-2 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> Errores encontrados
              </p>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {dryResult.errorDetails.map((err) => (
                  <div key={err.row} className="p-3 bg-red-50 rounded-lg text-sm">
                    <span className="font-medium text-red-700">Fila {err.row}:</span>{' '}
                    <span className="text-red-600">{err.errors.join(', ')}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {dryResult.errors === 0 && (
            <button
              onClick={handleConfirmImport}
              disabled={confirming}
              className="btn-primary w-full justify-center"
            >
              {confirming ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" /> Importando...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" /> Confirmar importación (
                  {dryResult.valid} registros)
                </>
              )}
            </button>
          )}
        </div>
      )}

      {/* Import success */}
      {importResult && (
        <div className="card p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="font-semibold text-gray-900">Importación completada</p>
              <p className="text-sm text-gray-500">
                {importResult.imported} registros importados
                {importResult.skipped > 0
                  ? `, ${importResult.skipped} omitidos (ya existían)`
                  : ''}
              </p>
            </div>
          </div>
          <button onClick={reset} className="btn-secondary">
            <RefreshCw className="w-4 h-4" /> Nueva importación
          </button>
        </div>
      )}
    </div>
  );
}
