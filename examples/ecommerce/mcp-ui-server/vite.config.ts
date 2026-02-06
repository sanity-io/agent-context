/**
 * Vite config — used only as a reference/fallback.
 * The actual build is driven by build-ui.mjs which calls Vite
 * programmatically per widget entry (see that file for details).
 */

import {defineConfig} from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
})
