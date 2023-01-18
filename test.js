import puppeteer from "puppeteer"
import {URL} from "node:url"
import fs from "fs"
import crypto from "crypto"

function findSubObject(object, pred, out) {
    if (pred(object)) {
        if (out.arr === undefined) {
            out.arr = []
        }
        out.arr.push(object)
    }
    for (let key of Object.keys(object)) {
        if (typeof object[key] === 'object' && object[key] !== null) {
            findSubObject(object[key], pred, out)
        }
    }
}

function scrapeInfo(profile_id, login, password) {
    return new Promise(async (resolve, reject) => {
        const browser = await puppeteer.launch({headless:false});

        let status = {
            main: false,
            experience: false,
            result: {}
        }
        let done = (name) => {
            status[name] = true
            if (status.main && status.experience) {
                browser.close()
                resolve(status.result)
            }
        }

        const page = await browser.newPage();

        await page.goto(`https://www.linkedin.com`);
        await page.waitForSelector('#session_key')
        await page.type('#session_key', login, {delay: 0.2})
        await page.type('#session_password', password, {delay: 0.2})
        await page.click('.sign-in-form__submit-button')
        await page.waitForSelector('.feed-identity-module')

        page.on('response', async (response) => {
            let url = new URL(response.url())
            if (url.pathname === '/voyager/api/graphql' && url.searchParams.get('queryId').startsWith('voyagerIdentityDashProfileCards.')) {
                let json = await response.json()
                let out = {arr: []}
                findSubObject(json, (obj) => obj.$type === 'com.linkedin.voyager.dash.identity.profile.tetris.EntityComponent' && obj.controlName === 'experience_company_logo', out)
                if (out.arr.length > 0) {
                    let companies = []
                    for (let company of out.arr) {
                        let position_name = company.title.text

                        let company_name = company.subtitle.text
                        if (company_name.includes('·')) {
                            company_name = company_name.substring(0, company_name.indexOf('·')).trim()
                        }

                        let period_str = company.caption.text
                        if (period_str.includes('·')) {
                            period_str = period_str.substring(0, period_str.indexOf('·')).trim()
                        }
                        let period_parts = period_str.split('-')
                        period_parts[0] = period_parts[0].trim()
                        period_parts[1] = period_parts[1].trim()
                        let start = new Date(period_parts[0])
                        let end = period_parts[1].toLowerCase() === 'present' ? undefined : new Date(period_parts[1])

                        companies.push({
                            position: position_name,
                            company: company_name,
                            period: {
                                start: {
                                    year: start.getFullYear(),
                                    month: start.getMonth()
                                },
                                end: !!end ? {
                                    year: end.getFullYear(),
                                    month: end.getMonth()
                                } : undefined
                            }
                        })

                        status.result.experience = companies
                        done('experience')
                    }
                }
            }
            else if (url.pathname === '/voyager/api/identity/dash/profiles' && url.searchParams.get('q') === 'memberIdentity' && url.searchParams.get('memberIdentity') === profile_id) {
                let data

                if (response.ok()) {
                    let body = await response.json()
                    let profile = body.included.find((item) => item['$type'] === 'com.linkedin.voyager.dash.identity.profile.Profile' && item.publicIdentifier === profile_id)
                    if (!!profile) {
                        let entity = profile.entityUrn.replace(/urn:li:fsd_profile:(.*)/, '$1')

                        status.result.first_name = profile.firstName
                        status.result.last_name = profile.lastName
                        status.result.headline = profile.headline
                        status.result.country = profile.location?.countryCode

                        let education = body.included.find((item) => item['$type'] === 'com.linkedin.voyager.dash.identity.profile.Education')
                        if (!!education) {
                            status.result.education = {
                                school: education.schoolName
                            }
                        }

                        /*let position = body.included.find((item) => item['$type'] === 'com.linkedin.voyager.dash.identity.profile.Position')
                        let company = body.included.find((item) => item['$type'] === 'com.linkedin.voyager.dash.organization.Company')
                        if (!!position && !!company) {
                            data.position = {
                                company: position.companyName,
                                company_link: company.url,
                                company_id: company.universalName,
                                start: {
                                    year: position.dateRange.start.year,
                                    month: position.dateRange.start.month,
                                }
                            }
                        }*/
                    }
                } else {
                    console.log(`server request for ${profile_id} failed`)
                }

                done('main')
            }
        })

        await page.goto(`https://www.linkedin.com/in/${profile_id}/`)
        //await page.waitForSelector('.feed-identity-module')
    })
}

scrapeInfo(/*'artembagnyuk'*/'tatsiana-durovich-24a784196', 'furreddragon256@gmail.com', 'u0kMoP2bWct3j0WY').then(data => {
    console.log(JSON.stringify(data, null, 4));
});