export declare function getAllLocations(): Promise<any>;
export interface LocationSearchParams {
    radius?: string;
    serviceId?: string;
    address?: string;
    weekday?: string;
    timeframe?: string;
}
export declare function searchLocations(params: LocationSearchParams): Promise<any>;
export declare function getLocationById(id: string, elements?: string): Promise<any>;
export interface InactiveLocationsParams {
    startDate?: string;
    endDate?: string;
    noOfDays?: string;
}
export declare function getInactiveLocations(params: InactiveLocationsParams): Promise<any>;
//# sourceMappingURL=locationsService.d.ts.map