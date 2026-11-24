"use client";

import { createContext } from "react";

/** The id of the project that is open. Empty until projects have loaded. Used to keep the logo per project. */
export const ProjectIdContext = createContext("");
