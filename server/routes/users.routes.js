
import express from "express";
import getUsers from "../services/user.service.js";

const router = express.Router();

const ALLOWED_SORT_FIELDS = new Set([
    "first_name",
    "last_name",
    "age",
    "nationality"
]);

const ALLOWED_DIRECTIONS = new Set(["asc", "desc"]);

function readString(value, name, defaultValue = "") {
    if (value === undefined) {
        return defaultValue;
    }
    if (typeof value !== "string") {
        throw new Error(`${name} must be a string`)
    }
    return value.trim();
}

function readList(value, name) {
    const text = readString(value, name);
    if (!text) {
        return [];
    }
    return [...new Set(text.split(",").map((item) => item.trim()).filter(Boolean))];
}

function readInteger(value, name, defaultValue, min, max) {
    if (value === undefined) {
        return defaultValue;
    }
    const text = readString(value, name);
    if (!/^\d+$/.test(text)) {
        throw new Error(`${name} must be an integer`);
    }
    const number = Number(text);

    if (!Number.isSafeInteger(number) || number < min || number > max) {
        throw new Error(`${name} must be between ${min} and ${max}`);
    }
    return number;
}

export default router;