import google from "googlethis";

export async function google_search(query: string, safe: boolean, language: string) {
    const options = {
        page: 0,
        safe: safe,
        parse_ads: false,
        additional_params: {
            // add additional parameters here, see https://moz.com/blog/the-ultimate-guide-to-the-google-search-parameters and https://www.seoquake.com/blog/google-search-param/
            hl: language
        }
    }

    return await google.search(query, options)
}

export async function google_images(query: string, safe: boolean) {
    return await google.image(query, {safe: safe})
    //const my_awesome_image = fs.readFileSync('./wow.png');
    //const reverse = await google.search(my_awesome_image, { ris: true });
}