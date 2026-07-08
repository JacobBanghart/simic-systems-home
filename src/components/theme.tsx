import { createTheme } from '@mui/material/styles';

export const themeOptions = createTheme({
    palette: {
        mode: 'dark',
        primary: { main: '#00dfc1', contrastText: '#00201a' },
        secondary: { main: '#8bd1e8', contrastText: '#003642' },
        error: { main: '#ffb4ab' },
        background: { default: '#08100e', paper: '#151d1b' },
        text: { primary: '#dbe5e0', secondary: '#b9cac4' },
        divider: 'rgba(185, 202, 196, 0.16)',
    },
    typography: {
        fontFamily: '"Hanken Grotesk", sans-serif',
    },
    shape: {
        borderRadius: 4,
    },
    components: {
        MuiButton: {
            styleOverrides: {
                root: {
                    fontFamily: '"JetBrains Mono", monospace',
                    fontSize: '0.7rem',
                    fontWeight: 500,
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                },
            },
        },
    },
})
