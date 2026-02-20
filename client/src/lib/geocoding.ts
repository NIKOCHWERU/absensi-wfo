export async function reverseGeocode(lat: number, lon: number): Promise<string> {
    try {
        const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}`,
            {
                headers: {
                    "Accept-Language": "id-ID",
                    "User-Agent": "AbsensiNH/1.0",
                },
            }
        );

        if (!response.ok) {
            throw new Error("Geocoding failed");
        }

        const data = await response.json();

        // Format the address properly
        // Nominatim returns 'display_name' which is usually very long.
        // We want something like "Jl. Kertabumi, Karawang Barat, Karawang"
        const addr = data.address;
        const road = addr.road || addr.pedestrian || addr.suburb || "";
        const city = addr.city || addr.town || addr.municipality || addr.county || "";
        const state = addr.state || "";

        if (road && city) {
            return `${road}, ${city}`;
        }

        return data.display_name.split(',').slice(0, 3).join(',');
    } catch (error) {
        console.error("Reverse geocoding error:", error);
        return `${lat.toFixed(4)}, ${lon.toFixed(4)}`; // Fallback to coordinates
    }
}
