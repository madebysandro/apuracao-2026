/** Formato bruto do JSON de cargo do TSE (campos usados na normalização). */
export type DadosBrutosCargo = {
	hg?: string;
	s?: { pstn?: string; ts?: string; st?: string };
	e?: { te?: string; est?: string; pcn?: string; pan?: string };
	v?: { vv?: string; vl?: string; pvbn?: string; ptvnn?: string };
	carg: Array<{
		nv?: string;
		qe?: string;
		agr: Array<{
			com?: string;
			nm?: string;
			tp?: string;
			vag?: string;
			par: Array<{
				sg?: string;
				tvtn?: string;
				tvtl?: string;
				cand: Array<{
					n?: string;
					nmu?: string;
					sqcand?: string;
					vap?: string;
					pvapn?: string;
					e?: string;
					st?: string;
					dvt?: string;
				}>;
			}>;
		}>;
	}>;
};
