import type { PyodideInterface } from 'pyodide';
export type StatusCallback = (state: string, label: string) => void;
export interface ExecutionResult {
  success: boolean; stdout: string; stderr: string; returnValue: string | null;
  durationMs: number; engine: string;
}
let pyodideLoadPromise: Promise<PyodideInterface> | null = null;
export async function ensurePyodideLoaded(onStatusChange?: StatusCallback): Promise<PyodideInterface> {
  onStatusChange?.('loading', '正在載入 Python 執行環境…');
  try {
    // Serve the package's loader unchanged: its Node-only imports must not be bundled.
    pyodideLoadPromise ??= (async () => {
      const indexURL = new URL(import.meta.env.BASE_URL + 'pyodide/', window.location.href).href;
      const loaderURL = new URL('pyodide.mjs', indexURL).href;
      const { loadPyodide } = await import(/* @vite-ignore */ loaderURL) as typeof import('pyodide');
      return loadPyodide({ indexURL });
    })();
    const instance = await pyodideLoadPromise;
    onStatusChange?.('ready', 'Pyodide (Wasm) 已就緒');
    return instance;
  } catch (error) {
    pyodideLoadPromise = null;
    onStatusChange?.('error', 'Python 執行環境載入失敗，請重新執行');
    throw error;
  }
}
export async function executePythonWithInput(code: string, stdinText = '', onStatusChange?: StatusCallback): Promise<ExecutionResult> {
  const startTime = performance.now();
  const stdoutLines: string[] = [];
  const stderrLines: string[] = [];

  try {
  const pyodide = await ensurePyodideLoaded(onStatusChange);

  if (pyodide) {
    try {
      onStatusChange?.('running', '程式碼執行中...');
      pyodide.setStdout({
        batched: (msg) => stdoutLines.push(msg),
      });
      pyodide.setStderr({
        batched: (msg) => stderrLines.push(msg),
      });

      // 將自訂測資注入 Python sys.stdin
      pyodide.globals.set('__stdin_text', stdinText);
      const wrapperCode = `
import sys, io
sys.stdin = io.StringIO(__stdin_text)
del __stdin_text
`;
      await pyodide.runPythonAsync(wrapperCode);

      if (typeof pyodide.loadPackagesFromImports === 'function') {
        await pyodide.loadPackagesFromImports(code);
      }

      const returnVal = await pyodide.runPythonAsync(code);
      const durationMs = Math.max(1, Math.round(performance.now() - startTime));
      onStatusChange?.('ready', 'Pyodide 3.12 (Wasm) 已就緒');

      return {
        success: stderrLines.length === 0,
        stdout: stdoutLines.join('\n'),
        stderr: stderrLines.join('\n'),
        returnValue: returnVal !== undefined && String(returnVal) !== 'None' ? String(returnVal) : null,
        durationMs,
        engine: 'Pyodide v0.26.4 WebAssembly',
      };
    } catch (err) {
      const durationMs = Math.max(1, Math.round(performance.now() - startTime));
      onStatusChange?.('ready', 'Pyodide 3.12 (Wasm) 已就緒');
      return {
        success: false,
        stdout: stdoutLines.join('\n'),
        stderr: (stderrLines.length ? stderrLines.join('\n') + '\n' : '') + (err instanceof Error ? err.message : String(err)),
        returnValue: null,
        durationMs,
        engine: 'Pyodide v0.26.4 WebAssembly',
      };
    }
  }

  } catch (error) {
    return { success: false, stdout: '', stderr: String(error), returnValue: null,
      durationMs: Math.round(performance.now() - startTime), engine: 'Pyodide v0.26.4 WebAssembly' };
  }
  throw new Error('Python runtime unavailable');
}
