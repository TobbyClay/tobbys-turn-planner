import { ValidMovementBehaviour } from "../settings/enableGrid";
import { AerisToken } from "../token/aerisToken";

declare global {
    namespace PIXI {
        interface FederatedEvent {
            interactionData?: {
                origin?: { x: number; y: number };
                destination?: { x: number; y: number };
                targets?: AerisToken[];
                clones?: AerisToken[];
                clearPreviewContainer?: boolean;
                contexts?: [];
                behaviour?: ValidMovementBehaviour;
                uncap?: boolean;
            };
            shiftKey?: boolean;
        }
    }
}

export {};
