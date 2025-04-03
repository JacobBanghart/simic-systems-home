import { Paper, Grid, Card, CardHeader, Divider, CardMedia, CardActions, Typography, Button, Box, Tab, Tabs, Slider, Container } from "@mui/material";
import { useState } from "react";


interface TabPanelProps {
    children?: React.ReactNode;
    index: number;
    value: number;
}
function CustomTabPanel(props: TabPanelProps) {
    const { children, value, index, ...other } = props;

    return (
        <Paper
            role="tabpanel"
            hidden={value !== index}
            id={`simple-tabpanel-${index}`}
            aria-labelledby={`simple-tab-${index}`}
            {...other}
        >
            {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
        </Paper>
    );
}
function a11yProps(index: number) {
    return {
        id: `simple-tab-${index}`,
        'aria-controls': `simple-tabpanel-${index}`,
    };
}

export function MainPage() {
    const [value, setValue] = useState(0); // State to track the active tab
    const [scale, setScale] = useState(1); // State to track the scale of the cards

    const handleChange = (event: React.SyntheticEvent, newValue: number) => {
        setValue(newValue); // Update the active tab value
    };

    const handleScaleChange = (event: Event, newValue: number | number[]) => {
        setScale(newValue as number); // Update the scale value
    };

    return (
        <>
            <Container>
                <Box sx={{ width: "100%" }}>
                    {/* Tabs Header */}
                    <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
                        <Tabs
                            value={value} // Bind the active tab value
                            onChange={handleChange} // Handle tab changes
                            aria-label="basic tabs example"
                        >
                            <Tab label="Magic" {...a11yProps(0)} />
                            <Tab label="One Piece" {...a11yProps(1)} />
                            <Tab label="Union Arena" {...a11yProps(2)} />
                        </Tabs>
                    </Box>

                    {/* Tab Panels */}
                    <CustomTabPanel value={value} index={0}>
                        <Grid container sx={{
                            justifyContent: "right"
                        }}>
                            <Grid size={{ xs: 12, sm: 4 }} sx={{
                                display: { xs: "none", sm: "block" },
                            }}>
                                <Box sx={{ padding: 2 }}>
                                    <Typography gutterBottom>Adjust Card Size</Typography>
                                    <Slider
                                        value={scale}
                                        min={0.5}
                                        max={1.5}
                                        step={0.01}
                                        onChange={handleScaleChange}
                                        aria-labelledby="card-size-slider"
                                        valueLabelDisplay="auto"
                                    />
                                </Box>
                            </Grid>
                        </Grid>
                        <Paper elevation={0}>
                            <Grid
                                container
                                spacing={{ xs: 2, md: 3 }}
                                fontSize={{
                                    xs: "0.5rem",
                                    sm: "0.8rem",
                                    md: "1rem",
                                }}
                                sx={{
                                    flexWrap: "wrap",
                                    justifyContent: {
                                        xs: "flex-start",
                                        sm: "center",
                                    },
                                    gap: "16px",
                                    containerType: "inline-size",
                                    paddingTop: "15px"
                                }}
                            >
                                {[{
                                    id: 1,
                                    name: "Cyclonic Rift",
                                    image: "https://cards.scryfall.io/large/front/d/f/dfb7c4b9-f2f4-4d4e-baf2-86551c8150fe.jpg?1702429366",
                                    quantity: 1,
                                }, {
                                    id: 2,
                                    name: "Wrath of God",
                                    image: "https://cards.scryfall.io/large/front/5/3/537d2b05-3f52-45d6-8fe3-26282085d0c6.jpg?1697121198",
                                    quantity: 2,
                                }, {
                                    id: 3,
                                    name: "Rug of Smothering",
                                    image: "https://cards.scryfall.io/large/front/a/7/a73d1cb0-d0dc-4f2a-9cf2-954d5889dd08.jpg?1674138031",
                                    quantity: 100,
                                },
                                {
                                    id: 4,
                                    name: "Lightning Bolt",
                                    image: "https://cards.scryfall.io/large/front/7/7/77c6fa74-5543-42ac-9ead-0e890b188e99.jpg?1706239968",
                                    quantity: 1,
                                },
                                {
                                    id: 5,
                                    name: "Lightning Bolt",
                                    image: "https://cards.scryfall.io/large/front/7/7/77c6fa74-5543-42ac-9ead-0e890b188e99.jpg?1706239968",
                                    quantity: 1,
                                },
                                {
                                    id: 6,
                                    name: "Asmoranomardicadaistinaculdacar",
                                    image: "https://cards.scryfall.io/large/front/d/9/d99a9a7d-d9ca-4c11-80ab-e39d5943a315.jpg?1632831210",
                                    quantity: 1,
                                },
                                {
                                    id: 7,
                                    name: "Okina, Temple to the Grandfathers",
                                    image: "https://cards.scryfall.io/large/front/e/e/ee8cf7aa-388c-47ec-be59-6ba98f3853cb.jpg?1562765617",
                                    quantity: 1,
                                },
                                ].map((e) => (
                                    <Card
                                        sx={{
                                            display: "flex",
                                            flexDirection: { xs: "row", sm: "column" },
                                            width: { xs: "100%", sm: `${14 * scale}rem` }, // Dynamically adjust width based on scale
                                            height: "auto",
                                            backgroundColor: "background.paper",
                                            boxShadow: 3,
                                            border: "1px solid",
                                            borderColor: "divider",
                                            borderRadius: "8px",
                                            transformOrigin: "top left",
                                        }}
                                        key={e.id}
                                    >
                                        <CardMedia
                                            component="img"
                                            image={e.image}
                                            alt={e.name}
                                            sx={{
                                                paddingX: { xs: "0px", sm: "8px" },
                                                width: { xs: "40%", sm: "calc(100% - 16px)" }, // Smaller width for horizontal layout on mobile
                                                marginTop: { xs: "0px", sm: "8px" },
                                                height: "auto",
                                                objectFit: "contain",
                                            }}
                                        />
                                        <Box
                                            sx={{
                                                display: "flex",
                                                flexDirection: "column",
                                                justifyContent: "space-between",
                                                padding: 2,
                                                flex: 1,
                                            }}
                                        >
                                            <CardHeader
                                                title={e.name}
                                                slotProps={{
                                                    title: {
                                                        sx: {
                                                            textAlign: { xs: "left", md: "center" },
                                                            fontSize: `${1.2 * scale}rem`,
                                                            wordBreak: "break-all"
                                                        },
                                                    }
                                                }}
                                                sx={{
                                                    maxWidth: "100%",
                                                    padding: '0',
                                                }}
                                            />
                                            <Divider />
                                            <CardActions
                                                sx={{
                                                    display: "flex",
                                                    justifyContent: "space-between",
                                                    marginTop: "auto",
                                                    paddingX: 0,
                                                }}
                                            >
                                                <Grid container justifyContent={"left"}>
                                                    <Typography
                                                        gutterBottom
                                                        sx={{
                                                            color: "text.secondary",
                                                            fontSize: `${1 * scale}rem`, // Dynamically adjust font size based on scale
                                                            paddingLeft: "8px",
                                                        }}
                                                    >
                                                        Quantity Available: {e.quantity}
                                                    </Typography>
                                                    <Button
                                                        sx={{
                                                            fontSize: `${0.9 * scale}rem`, // Dynamically adjust button font size
                                                        }}
                                                    >
                                                        Add to Cart
                                                    </Button>
                                                </Grid>
                                            </CardActions>
                                        </Box>
                                    </Card>
                                ))}
                            </Grid>
                        </Paper>
                    </CustomTabPanel>
                    <CustomTabPanel value={value} index={1}>
                        <Typography>One Piece Content</Typography>
                    </CustomTabPanel>
                    <CustomTabPanel value={value} index={2}>
                        <Typography>Union Arena Content</Typography>
                    </CustomTabPanel>
                </Box >
            </Container>
        </>
    );
}
