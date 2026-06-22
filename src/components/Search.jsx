import { useSearchParams } from 'react-router'
import { useState } from 'react'

export function SearchForm({ paramKey, label_text, button_text }) {

    const key = paramKey ?? 'q';

    const [searchParams,setSearchParams] = useSearchParams()
    const [search, setSearch] = useState(searchParams.get(key) ?? '')

    function handleSearch(event) {
        event.preventDefault()

        if (search === '' || search == null)
            searchParams.delete(key)
        else
            searchParams.set(key, search)

        setSearchParams(searchParams)
    }

    return (
        <form onSubmit={handleSearch} >
         <label htmlFor="search_input" >{label_text == null ? 'Search: ' : label_text }</label>
         <input type='textbox' id="search_input" name="search" onChange={(event) => setSearch(event.target.value)} value={search} />
        <button type="submit">{button_text == null ? 'Search' : button_text}</button>
        </form>
    )

}
