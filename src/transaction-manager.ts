import * as web3 from "@solana/web3.js";

export function findInstructionByProgramId(instructions: Array<web3.ParsedInstruction | web3.PartiallyDecodedInstruction>, programId: web3.PublicKey): web3.ParsedInstruction | web3.PartiallyDecodedInstruction | null {
    for (let i = 0; i < instructions.length; i++) {
        if (instructions[i].programId.equals(programId)) {
            return instructions[i];
        }
    }

    return null;
}