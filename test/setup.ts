import { afterAll, afterEach, beforeAll } from "vitest";
import { network } from "./helpers/rede";

beforeAll(() => {
	network.enable();
});

afterEach(() => {
	network.resetHandlers();
});

afterAll(() => {
	network.disable();
});
