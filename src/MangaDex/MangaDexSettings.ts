
import {
    MDLanguages,
    MDRatings,
    MDImageQuality
} from './MangaDexHelper'


export function getLanguages(): string[] {
    return (Application.getState('languages') as string[] | undefined) ?? MDLanguages.getDefault()
}

export function getRatings(): string[] {
    return (Application.getState('ratings') as string[] | undefined) ?? MDRatings.getDefault()
}

export function getDataSaver(): boolean {
    return (Application.getState('data_saver') as boolean | undefined) ?? false
}

export function getSkipSameChapter(): boolean {
    return (Application.getState('skip_same_chapter') as boolean | undefined) ?? false
}

export function getForcePort443(): boolean {
    return (Application.getState('force_port_443') as boolean | undefined) ?? false
}

export function setLanguages(value: string[]): void {
    Application.setState(value, 'languages')
}

export function setRatings(value: string[]): void {
    Application.setState(value, 'ratings')
}

export function setDataSaver(value: boolean): void {
    Application.setState(value, 'data_saver')
}

export function setSkipSameChapter(value: boolean): void {
    Application.setState(value, 'skip_same_chapter')
}

export function setForcePort443(value: boolean): void {
    Application.setState(value, 'force_port_443')
}

export function getHomepageThumbnail(): string {
    return (Application.getState('homepage_thumbnail') as string | undefined) ?? MDImageQuality.getDefault('homepage')
}

export function getSearchThumbnail(): string {
    return (Application.getState('search_thumbnail') as string | undefined) ?? MDImageQuality.getDefault('search')
}

export function getMangaThumbnail(): string {
    return (Application.getState('manga_thumbnail') as string | undefined) ?? MDImageQuality.getDefault('manga')
}

export type AccessToken = {accessToken: string, refreshToken?: string, tokenBody: any}

export function getAccessToken(): AccessToken | undefined {
    const accessToken = Application.getSecureState('access_token') as string | undefined
    const refreshToken = Application.getSecureState('refresh_token') as string | undefined

    if (!accessToken) return undefined

    return {
        accessToken,
        refreshToken,
        tokenBody: parseAccessToken(accessToken)
    }
}

export function saveAccessToken(accessToken: string | undefined, refreshToken: string | undefined): AccessToken | undefined {
    Application.setSecureState(accessToken, 'access_token')
    Application.setSecureState(refreshToken, 'refresh_token')

    if (!accessToken) return undefined

    return {
        accessToken,
        refreshToken,
        tokenBody: parseAccessToken(accessToken)
    }
}

export function parseAccessToken(accessToken: string | undefined): any | undefined {
    if (!accessToken) return undefined

    const tokenBodyBase64 = accessToken.split('.')[1]
    if (!tokenBodyBase64) return undefined

    const tokenBodyJSON = Buffer.from(tokenBodyBase64, 'base64').toString('ascii')
    return JSON.parse(tokenBodyJSON)
}

const authRequestCache: Record<string, Promise<any | undefined>> = {}

export function authEndpointRequest(endpoint: 'login' | 'refresh' | 'logout', payload: any): Promise<any> {
    if (authRequestCache[endpoint] == undefined) {
        console.log('started request')
        authRequestCache[endpoint] = _authEndpointRequest(endpoint, payload).finally(() => {
            delete authRequestCache[endpoint]
            console.log('completed request')
        })
    }

    return authRequestCache[endpoint]!
}

async function _authEndpointRequest(endpoint: 'login' | 'refresh' | 'logout', payload: any): Promise<any> {
    const [response, buffer] = await Application.scheduleRequest({
        method: 'POST',
        url: 'https://api.mangadex.dev/auth/' + endpoint,
        headers: {
            'Content-Type': 'application/json'
        },
        body: payload
    })

    if (response.status > 399) {
        throw new Error('Request failed with error code:' + response.status)
    }

    const data = Application.arrayBufferToUTF8String(buffer)
    const jsonData = (typeof data === 'string') ? JSON.parse(data) : data
    console.log(data)
    if (jsonData.result != 'ok') {
        throw new Error('Request failed with errors: ' + jsonData.errors.map((x: any) => `[${x.title}]: ${x.detail}`))
    }

    return jsonData
}

// export function contentSettings() {
//     return App.createDUINavigationButton({
//         id: 'content_settings',
//         label: 'Content Settings',
//         form: App.createDUIForm({
//             sections: async () => [
//                 App.createDUISection({
//                     isHidden: false,
//                     id: 'content',
//                     footer: 'When enabled, same chapters from different scanlation group will not be shown.',
//                     rows: async () => {
//                         await Promise.all([
//                             getLanguages(stateManager),
//                             getRatings(stateManager),
//                             getDataSaver(stateManager),
//                             getSkipSameChapter(stateManager)
//                         ])

//                         return await [
//                             App.createDUISelect({
//                                 id: 'languages',
//                                 label: 'Languages',
//                                 options: MDLanguages.getMDCodeList(),
//                                 labelResolver: async (option) => MDLanguages.getName(option),
//                                 value: App.createDUIBinding({
//                                     get: async () => getLanguages(stateManager),
//                                     set: async (newValue) => { await stateManager.store('languages', newValue) }
//                                 }),
//                                 allowsMultiselect: true
//                             }),

//                             App.createDUISelect({
//                                 id: 'ratings',
//                                 label: 'Content Rating',
//                                 options: MDRatings.getEnumList(),
//                                 labelResolver: async (option) => MDRatings.getName(option),
//                                 value: App.createDUIBinding({
//                                     get: async () => getRatings(stateManager),
//                                     set: async (newValue) => { await stateManager.store('ratings', newValue) }
//                                 }),
//                                 allowsMultiselect: true
//                             }),

//                             App.createDUISwitch({
//                                 id: 'data_saver',
//                                 label: 'Data Saver',
//                                 value: App.createDUIBinding({
//                                     get: async () => getDataSaver(stateManager),
//                                     set: async (newValue) => { await stateManager.store('data_saver', newValue) }
//                                 })
//                             }),

//                             App.createDUISwitch({
//                                 id: 'skip_same_chapter',
//                                 label: 'Skip Same Chapter',
//                                 value: App.createDUIBinding({
//                                     get: async () => getSkipSameChapter(stateManager),
//                                     set: async (newValue) => { await stateManager.store('skip_same_chapter', newValue) }
//                                 })
//                             }),

//                             App.createDUISwitch({
//                                 id: 'force_port_443',
//                                 label: 'Force Port 443',
//                                 value: App.createDUIBinding({
//                                     get: async () => forcePort443(stateManager),
//                                     set: async (newValue) => { await stateManager.store('force_port_443', newValue) }
//                                 })
//                             })
//                         ]
//                     }
//                 })
//             ]
//         })
//     })
// }

// export async function accountSettings(requestManager: RequestManager) {
//     const accessToken = await getAccessToken()
//     if (!accessToken) {
//         return App.createDUIOAuthButton({
//             id: 'mdex_oauth',
//             label: 'Login with MangaDex',
//             authorizeEndpoint: 'https://auth.mangadex.dev/realms/mangadex/protocol/openid-connect/auth',
//             clientId: 'thirdparty-oauth-client',
//             redirectUri: 'paperback://mangadex-login',
//             responseType: {
//                 type: 'pkce',
//                 pkceCodeLength: 64,
//                 pkceCodeMethod: 'S256',
//                 formEncodeGrant: true,
//                 tokenEndpoint: 'https://auth.mangadex.dev/realms/mangadex/protocol/openid-connect/token'
//             },

//             async successHandler(accessToken, refreshToken?) {
//                 await saveAccessToken(stateManager, accessToken, refreshToken)
//             },
//             scopes: ['email', 'openid']
//         })
//     }

//     return App.createDUINavigationButton({
//         id: 'account_settings',
//         label: 'Session Info',
//         form: App.createDUIForm({
//             onSubmit: async () => undefined,
//             sections: async () => {
//                 const accessToken = await getAccessToken(stateManager)

//                 if (!accessToken) {
//                     return [
//                         App.createDUISection({
//                             isHidden: false,
//                             id: 'not_logged_in_section',
//                             rows: async () => [
//                                 App.createDUILabel({
//                                     id: 'not_logged_in',
//                                     label: 'Not Logged In'
//                                 })
//                             ]
//                         })
//                     ]
//                 }

//                 return [
//                     App.createDUISection({
//                         isHidden: false,
//                         id: 'introspect',
//                         rows: async () => {
//                             return Object.keys(accessToken.tokenBody).map((key) => {
//                                 const value = accessToken.tokenBody[key]
//                                 return App.createDUIMultilineLabel({
//                                     id: key,
//                                     label: key,
//                                     value: Array.isArray(value) ? value.join('\n') : `${value}`
//                                 })
//                             })
//                         }
//                     }),

//                     App.createDUISection({
//                         isHidden: false,
//                         id: 'refresh_button_section',
//                         rows: async () => [
//                             App.createDUIButton({
//                                 id: 'refresh_token_button',
//                                 label: 'Refresh Token',
//                                 onTap: async () => {
//                                     const response = await authEndpointRequest(requestManager, 'refresh', { token: accessToken.refreshToken })
//                                     await saveAccessToken(stateManager, response.token.session, response.token.refresh)
//                                 }
//                             }),
//                             App.createDUIButton({
//                                 id: 'logout_button',
//                                 label: 'Logout',
//                                 onTap: async () => {
//                                     await authEndpointRequest(requestManager, 'logout', {})
//                                     await saveAccessToken(stateManager, undefined, undefined)
//                                 }
//                             })
//                         ]
//                     })
//                 ]
//             }
//         })
//     })
// }

// export function thumbnailSettings() {
//     return App.createDUINavigationButton({
//         id: 'thumbnail_settings',
//         label: 'Thumbnail Quality',
//         form: App.createDUIForm({
//             sections: async () => [
//                 App.createDUISection({
//                     isHidden: false,
//                     id: 'thumbnail',
//                     rows: async () => {
//                         await Promise.all([
//                             getHomepageThumbnail(stateManager),
//                             getSearchThumbnail(stateManager),
//                             getMangaThumbnail(stateManager)
//                         ])
//                         return await [
//                             App.createDUISelect({
//                                 id: 'homepage_thumbnail',
//                                 label: 'Homepage Thumbnail',
//                                 options: MDImageQuality.getEnumList(),
//                                 labelResolver: async (option) => MDImageQuality.getName(option),
//                                 value: App.createDUIBinding({
//                                     get: async () => getHomepageThumbnail(stateManager),
//                                     set: async (newValue) => await stateManager.store('homepage_thumbnail', newValue)

//                                 }),
//                                 allowsMultiselect: false
//                             }),
//                             App.createDUISelect({
//                                 id: 'search_thumbnail',
//                                 label: 'Search Thumbnail',
//                                 options: MDImageQuality.getEnumList(),
//                                 labelResolver: async (option) => MDImageQuality.getName(option),
//                                 value: App.createDUIBinding({
//                                     get: async () => getSearchThumbnail(stateManager),
//                                     set: async (newValue) => await stateManager.store('search_thumbnail', newValue)

//                                 }),
//                                 allowsMultiselect: false
//                             }),
//                             App.createDUISelect({
//                                 id: 'manga_thumbnail',
//                                 label: 'Manga Thumbnail',
//                                 options: MDImageQuality.getEnumList(),
//                                 labelResolver: async (option) => MDImageQuality.getName(option),
//                                 value: App.createDUIBinding({
//                                     get: async () => getMangaThumbnail(stateManager),
//                                     set: async (newValue) => await stateManager.store('manga_thumbnail', newValue)

//                                 }),
//                                 allowsMultiselect: false
//                             })
//                         ]
//                     }
//                 })
//             ]
//         })
//     })
// }

// export function resetSettings() {
//     return App.createDUIButton({
//         id: 'reset',
//         label: 'Reset to Default',
//         onTap: async () => {
//             await Promise.all([
//                 stateManager.store('languages', null),
//                 stateManager.store('ratings', null),
//                 stateManager.store('data_saver', null),
//                 stateManager.store('skip_same_chapter', null),
//                 stateManager.store('homepage_thumbnail', null),
//                 stateManager.store('search_thumbnail', null),
//                 stateManager.store('manga_thumbnail', null)])
//         }
//     })
// }