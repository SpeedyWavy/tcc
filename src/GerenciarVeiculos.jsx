import './GerenciarVeiculos.css'
import { useState } from 'react'
import logords from './assets/logo-rds.png'
import user from './assets/place-user.png'
import { CornerDownLeft, CirclePlus } from 'lucide-react'
import { ArrowDownNarrowWide } from 'lucide-react'


function GerenciarVeiculos() {
  return (
    <>
      <div className="ui-header">
              <div className="logo">
                <img src={logords} alt={logords} />
              </div>
              <div className="usuario">
                {/* <h1>Usuario</h1> */}
                <img src={user} alt={user} />
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
