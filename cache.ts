import fs from 'fs'

export default class Cache {
    private static readonly filename: string = './cache_data.json';

    private static loadData() {
        return fs.existsSync(Cache.filename) ? JSON.parse(fs.readFileSync(Cache.filename).toString()) : {}
    }

    public static setValue(key: string, value: any) {
        let data = Cache.loadData()
        data[key] = value
        fs.writeFileSync(Cache.filename, JSON.stringify(data))
    }

    public static getValue(key: string, defaultValue: any = undefined) {
        const data = Cache.loadData()
        const result =  data[key]
        if (result === undefined) {
            return defaultValue
        } else {
            return result
        }
    }

    public static clear() {
        if (fs.existsSync(Cache.filename)) fs.unlinkSync(Cache.filename)
    }
}
