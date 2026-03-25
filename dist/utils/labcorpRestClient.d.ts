import { AxiosRequestConfig, AxiosResponse } from "axios";
export interface LabcorpRequestConfig extends AxiosRequestConfig {
    labcorpEndpoint?: string;
}
export declare function labcorpRequest<T = any>(method: AxiosRequestConfig["method"], path: string, config?: LabcorpRequestConfig): Promise<AxiosResponse<T>>;
//# sourceMappingURL=labcorpRestClient.d.ts.map