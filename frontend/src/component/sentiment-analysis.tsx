import React, {Component} from 'react'
import Cookies from 'js-cookie'
import axios from 'axios'

import Character from './sentiment-analysis-components/character';
import ShowPolarity from './sentiment-analysis-components/showPolarity'
import CharacterModal from './sentiment-analysis-components/characterModal'

import './sentiment-analysis.css'

function getStringIndices(str: string, subStr: string) {
    const indices: number[] = [];
    let index = str.indexOf(subStr);
    let totalIndex = 0;
    while (index !== -1) {
        totalIndex += index;
        indices.push(totalIndex - indices.length*subStr.length);
        totalIndex += subStr.length;
        index = str.slice(totalIndex).indexOf(subStr);
    }
    //for (let i=0; i < indices.length; i++)
    //    indices[i] -= i*subStr.length;
    return indices;
}

interface IProps {    
}

interface IState {
    text: string,
    polarity: number,
    assessments: [string[], number][],
    assessmentsIndices: number[],
    showModal: boolean,
    modalText: string,
    modalScore: number,
    typing: boolean,
    lineBreaks: number[],
}

export default class SentimentAnalysis extends Component<IProps, IState> {
    //input : React.RefObject<HTMLParagraphElement> = React.createRef<HTMLParagraphElement>();

    constructor(props: IProps) {
        super(props);
        this.state = {
            text: "",
            polarity: 0,
            assessments: [],
            assessmentsIndices: [],
            showModal: false,
            modalText: "",
            modalScore: 0,
            typing: true,
            lineBreaks: [],
        };

        this.setVars = this.setVars.bind(this);
        this.handleChange = this.handleChange.bind(this);
        this.submit = this.submit.bind(this);
        this.tokensToIndices = this.tokensToIndices.bind(this);
        this.show = this.show.bind(this);
        this.hide = this.hide.bind(this);
        this.passClick = this.passClick.bind(this);
        this.passHover = this.passHover.bind(this);
        this.getTypingClasses = this.getTypingClasses.bind(this);
        this.InfoBox = this.InfoBox.bind(this);

        //this.mouseMove = this.mouseMove.bind(this);
    }

    /*tokensToIndices(assessments: [string[], number][]) {
        let startIndex = 0;
        const indexAssessments: [[number, number][], number][] = []
        for (let assessment of assessments) {
            const score = assessment[1]
            const indices: [number, number][] = []
            for (let token of assessment[0]) {
                const index = this.state.text.slice(startIndex).indexOf(token)
                indices.push([index, token.length])
                startIndex += index+token.length
            }
            indexAssessments.push([indices, score])
        }
        return indexAssessments
    }*/

    fillSpaces(indexAssessments: number[], numAssessments: number, text:string) {
        for (let i=0; i < numAssessments; i++) {
            let startGap : number | null = null;
            for (let j=0; j < indexAssessments.length-1; j++) {
                if (indexAssessments[j] === i && indexAssessments[j+1] !== i)
                    startGap = j+1;
                else if (startGap && text[j] !== ' ')
                    startGap = null;
                else if (startGap && indexAssessments[j+1] === i) {
                    for (let k=startGap; k <= j; k++)
                        indexAssessments[k] = i;
                    startGap = null;
                }
            }
        }
    }

    tokensToIndices(assessments: [string[], number][]) {
        let startIndex = 0;
        const indexAssessments: number[] = Array(this.state.text.length).fill(-1)
        for (let i=0; i < assessments.length; i++) {
            for (const token of assessments[i][0]) {
                let index = this.state.text.toLowerCase().slice(startIndex).indexOf(token);
                for (let j=0; j < token.length; j++) {
                    indexAssessments[startIndex+index+j] = i
                }
                startIndex += index+token.length
            }
        }
        this.fillSpaces(indexAssessments, assessments.length, this.state.text);
        return indexAssessments
    }

    //WIP
    /*processAssessments(assessments: [string[], number][]) {
        const words = this.state.text.split(" ")
        assessments = assessments.map(([tokens, score]) => [concatTokens(tokens), score])
        let currentAssessment = 0
        let tokens: {text: string, score: number}[] = [];
        for (let i=0; i < words.length; i++) {
            if (currentAssessment === assessments.length || (words[i].toLowerCase() !== assessments[currentAssessment][0][0])) {
                tokens.push({text: words[i], score: 0})
            }
            else {
                const length = assessments[currentAssessment][0].length

            }
        }
    }*/

    setVars(result: {polarity: number, assessments: [string[], number][]}) {
        this.setState({polarity: result.polarity, assessments: result.assessments, assessmentsIndices: this.tokensToIndices(result.assessments)});
    }

    async handleChange(value: string) {
        const lineBreakIndices = getStringIndices(value, "<br>");
        this.setState({lineBreaks: lineBreakIndices});
        const decoded = (new DOMParser().parseFromString(value, "text/html")).documentElement.textContent;
        if (decoded) {
            this.setState({text: decoded});
            console.log(decoded)
            let toSubmitChrs = [];
            for (let i=0; i < decoded.length; i++) {
                if (lineBreakIndices.includes(i))
                    toSubmitChrs.push(" ")
                toSubmitChrs.push(decoded[i]);
            }
            this.submit(toSubmitChrs.join(""));
        }

        /*if (value) {
            this.setState({text: value});
            this.submit(value);
            //if (value.length > 0)
            //    this.setState({pointerEvents: 'none'})
        }*/

    }

    async submit(text: string) {
        console.log(text);
        axios.post('/api/sentiment-analysis/', {
            text: text,
        }, {
            headers: { 'X-CSRFToken': Cookies.get('csrftoken') }
        })
        .then(response => this.setVars(response.data))
        .catch((error) => console.log(error))
    }

    show(text: string, score: number) {
        this.setState({showModal: true, modalText: text, modalScore: score})
    }

    hide() {
        this.setState({showModal: false})
    }

    passClick(e: any) {
        e.stopPropagation();
        this.setState({typing: true});
    }

    passHover() {
        if (this.state.assessments.length > 0)
            this.setState({typing: false});
    }

    getTypingClasses() {
        if (this.state.typing)
            return "typing activated"
        return "typing"
    }

    InfoBox() {
        if (this.state.assessments.length > 0) {
            if (this.state.typing)
                return(<span>Click out to hover</span>)
            return(<span>Click box to type</span>)
        }
        return (<></>)
    }

    /*keyPress(event: any) {
        if(event.key === "Enter") {
            event.preventDefault();
          }
    }*/

    render() {
        const characters = [];

        for (let i=0; i < this.state.text.length; i++) {
            for (const lineBreak of this.state.lineBreaks)
                if (lineBreak == i)
                    characters.push(<br/>);
            characters.push(<Character key={i} character={this.state.text[i]} assessment={this.state.assessments[this.state.assessmentsIndices[i]]} parentShow={this.show} parentHide={this.hide}/>)
        }
        
        if (characters.length === 0)
            characters.push(<span className="gray" key="0">Text</span>)
        
        /*if (this.input.current) {
            const html = this.input.current.innerHTML;
            console.log(html);
        }*/

        return(
            <div onClick={this.passHover} className="sentiment-analysis">
                
                <ShowPolarity polarity={this.state.polarity}/>

                <div className="text">
                    <p onClick={this.passClick} id="display" className="display">{characters}</p>
                    <div className={this.getTypingClasses()}>
                        <p /*ref={this.input}*/ onClick={e => e.stopPropagation()} /*onKeyDown={this.keyPress}*/ onInput={e => this.handleChange(e.currentTarget.innerHTML)} contentEditable></p>
                        <div className="info">
                            <this.InfoBox/>
                        </div>

                        { this.state.showModal &&
                            <CharacterModal text={this.state.modalText} score={this.state.modalScore}/>
                        }
                    </div>
                </div>

            </div>
        )
    }
}