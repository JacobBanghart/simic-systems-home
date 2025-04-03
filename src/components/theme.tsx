import { createTheme, type ThemeOptions } from '@mui/material/styles';

export const themeOptions = createTheme({
    colorSchemes: {
        dark: true,
        light: true,
    },
    palette: {
        mode: 'light',
        primary: {
            main: '#279214',
            light: '#0fde3e',
        },
        secondary: {
            main: '#008fff',
        },
    }
})
