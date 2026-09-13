declare global {
	namespace App {
		interface Locals {
			userId: string | null;
			admin: boolean;
		}
		interface PageState {
			entered?: boolean;
		}
	}
}

export {};
