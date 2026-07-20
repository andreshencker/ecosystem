// src/app/common/theme/ThemeSwitcher.tsx
import * as React from "react";
import {IconButton, Tooltip} from "@mui/material";
import LightModeRounded from "@mui/icons-material/LightModeRounded";
import DarkModeRounded from "@mui/icons-material/DarkModeRounded";
import {useThemeMode} from "./AppThemeProvider";

export default function ThemeSwitcher() {
    const {mode, toggle} = useThemeMode();
    const isDark = mode === "dark";
    return (
        <Tooltip title={isDark ? "Switch to light" : "Switch to dark"}>
            <IconButton onClick={toggle} size="small" sx={{ml: .5}}>
                {isDark ? <LightModeRounded/> : <DarkModeRounded/>}
            </IconButton>
        </Tooltip>
    );
}