import { InvalidOptionArgumentError } from "commander"

export const argParse = (type: "int" | "float") => {
    return (value: string, _: unknown) => {
        if (type === "int") {
            const num = parseInt(value)
            if (isNaN(num)) throw new InvalidOptionArgumentError("Expected an integar")
            return num
        } else if (type === "float") {
            const num = parseFloat(value)
            if (isNaN(num)) throw new InvalidOptionArgumentError("Expected an number")
            return num
        }
    }
}
