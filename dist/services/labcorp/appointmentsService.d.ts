export interface AppointmentTimesParams {
    locationId: string;
    serviceId: string;
    startDate: string;
    numberOfDays?: string;
    weekday?: string;
    timeframe?: string;
}
export declare function getAppointmentTimes(params: AppointmentTimesParams): Promise<any>;
export declare function bookAppointment(requestBody: any): Promise<any>;
export declare function getAppointmentByConfirmationNumber(confirmationNumber: string): Promise<any>;
export declare function updateAppointment(confirmationNumber: string, requestBody: any): Promise<any>;
export declare function cancelAppointment(confirmationNumber: string, requestBody: any): Promise<any>;
export declare function getAppointmentTracking(id: string): Promise<any>;
//# sourceMappingURL=appointmentsService.d.ts.map