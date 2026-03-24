import './css/GerenciarVeiculos.css'
import { useState } from 'react'
import user from '../assets/place-user.png'
import { CornerDownLeft, CirclePlus } from 'lucide-react'
import { ArrowDownNarrowWide } from 'lucide-react'


function GerenciarVeiculos() {
  return (
    <>
      <div className="ui-header">
              <div className="logo"></div>
              <div className="usuario">
                {/* <h1>Usuario</h1> */}
                <img src={user} alt={user} />
                <p>Usuario</p>
              </div>
              <div className="ui-header-extra"></div>
            </div>
            <div className="voltar"><a href="/app"> <CornerDownLeft />   Voltar</a></div>
      
            <div className="adicionar">
              <button type="button" className="adicionar-botao">
                <CirclePlus />
                Adicionar
              </button>
            </div>
    </>
  )
}

export default GerenciarVeiculos
